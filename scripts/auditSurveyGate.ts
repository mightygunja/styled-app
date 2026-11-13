/**
 * Survey gate audit: an established member is never asked for the survey.
 *
 * What went wrong: when Firestore believes it is offline it answers a read
 * from its local copy instead of failing. For this app that copy is an EMPTY
 * closet and a user document with NO style profile, so the app read a member
 * of long standing as a brand-new account - offered the survey again, asked
 * for a style profile, invited them to add their first pieces - and the
 * session cache then repeated that answer for five minutes.
 *
 * Fails when:
 *   - a read answered from the local copy is taken as the truth (the real
 *     Firestore SDK is run offline here to prove the behaviour the fix
 *     depends on);
 *   - an unconfirmed answer is kept by the session cache;
 *   - any prompt is shown when the profile could not be read;
 *   - the survey is offered to an account that has a profile, or has clothes
 *     in its closet, or declined it;
 *   - the department question is asked of an account that answered it;
 *   - a screen sends a member to the survey or the profile builder to answer
 *     the one-tap department question;
 *   - the first-run flag can outlive the account it was set for.
 *
 * Run:  npx tsx scripts/auditSurveyGate.ts
 */

import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  disableNetwork,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { departmentFromCloset, departmentFromProfile, inferDepartment } from '../src/services/departmentInference';
import { readConfirmed, UnconfirmedReadError } from '../src/services/confirmedRead';
import { createSessionCache, uncached } from '../src/services/sessionCache';
import {
  homePrompts,
  profileKnowledge,
  departmentQuestionDue,
  profileInviteDue,
  ProfileKnowledge,
} from '../src/services/profilePrompts';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

type Snap = { metadata: { fromCache: boolean }; tag: string };
const snap = (tag: string, fromCache: boolean): Snap => ({ metadata: { fromCache }, tag });

(async () => {
  // ---- 1. readConfirmed ----
  console.log('# Confirmed reads');
  {
    const slept: number[] = [];
    const sleep = async (ms: number) => void slept.push(ms);
    let serverCalls = 0;

    const direct = await readConfirmed(
      async () => snap('server', false),
      async () => { serverCalls += 1; return snap('server2', false); },
      { sleep }
    );
    check(direct.confirmed && direct.snapshot?.tag === 'server', 'an answer from the server is confirmed as it stands');
    check(serverCalls === 0 && slept.length === 0, 'and costs no retry and no wait');

    serverCalls = 0;
    const recovered = await readConfirmed(
      async () => snap('local', true),
      async () => {
        serverCalls += 1;
        if (serverCalls < 2) throw new Error('offline');
        return snap('server', false);
      },
      { sleep, delaysMs: [5, 9] }
    );
    check(recovered.confirmed && recovered.snapshot?.tag === 'server', 'a local answer is replaced by the server once it is reachable');
    check(serverCalls === 2 && slept.join(',') === '5,9', `it waits before each attempt, in order (${slept.join(',')})`);

    const stuck = await readConfirmed(
      async () => snap('local', true),
      async () => { throw new Error('offline'); },
      { sleep, delaysMs: [1, 1] }
    );
    check(!stuck.confirmed && stuck.snapshot?.tag === 'local', 'a local answer the server never confirms is reported as UNCONFIRMED');

    const stillLocal = await readConfirmed(
      async () => snap('local', true),
      async () => snap('local-again', true),
      { sleep, delaysMs: [1] }
    );
    check(!stillLocal.confirmed, 'a "server" read that still answers from the local copy does not count');

    let rejected: unknown;
    try {
      await readConfirmed<Snap>(
        async () => { throw new Error('client is offline'); },
        async () => { throw new Error('unavailable'); },
        { sleep, delaysMs: [1] }
      );
    } catch (error) {
      rejected = error;
    }
    check((rejected as Error)?.message === 'client is offline', 'when nothing comes back at all it fails with the original error');

    const lateServer = await readConfirmed<Snap>(
      async () => { throw new Error('client is offline'); },
      async () => snap('server', false),
      { sleep, delaysMs: [1] }
    );
    check(lateServer.confirmed && lateServer.snapshot?.tag === 'server', 'a read that failed outright is still rescued by a later server answer');
    check(new UnconfirmedReadError('x') instanceof Error && new UnconfirmedReadError('x').code === 'read-unconfirmed', 'the unconfirmed error is a real Error with a code');
  }

  // ---- 2. The real SDK, offline ----
  console.log('# Firestore, offline (the behaviour the fix depends on)');
  {
    const app = initializeApp({ projectId: 'survey-gate-audit', apiKey: 'none', appId: 'none' });
    const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    await disableNetwork(db);
    const userRef = doc(db, 'users', 'member');
    // What presenceService.recordSession does on every launch, not awaited.
    setDoc(userRef, { lastActiveAt: serverTimestamp(), lastPlatform: 'ios' }, { merge: true }).catch(() => {});

    const naive = await getDoc(userRef);
    check(
      naive.exists() && !(naive.data() as any).styleProfile && naive.metadata.fromCache,
      'offline, the user document is ANSWERED (not failed) with no style profile - and says it came from the local copy'
    );
    const profile = await readConfirmed(() => getDoc(userRef), () => getDocFromServer(userRef), { delaysMs: [5, 5] });
    check(!profile.confirmed, 'readConfirmed does not accept that answer as the profile');

    const closetQuery = query(collection(db, 'closetItems'), where('userId', '==', 'member'), orderBy('createdAt', 'desc'));
    const naiveCloset = await getDocs(closetQuery);
    check(naiveCloset.size === 0 && naiveCloset.metadata.fromCache, 'offline, the closet query is ANSWERED as empty - and says it came from the local copy');
    const closet = await readConfirmed(() => getDocs(closetQuery), () => getDocsFromServer(closetQuery), { delaysMs: [5, 5] });
    check(!closet.confirmed, 'readConfirmed does not accept that answer as the closet');
  }

  // ---- 3. Uncached answers ----
  console.log('# Answers the cache must not keep');
  {
    let loads = 0;
    const cache = createSessionCache<string[] | null>({ ttlMs: 60_000, copy: v => (v ? [...v] : null) });
    const once = () => { loads += 1; return Promise.resolve(uncached<string[] | null>(['local'])); };
    const [a, b] = await Promise.all([cache.get('u', once), cache.get('u', once)]);
    check(a?.[0] === 'local' && b?.[0] === 'local' && loads === 1, 'readers that asked together share an uncached answer');
    check(cache.peek('u') === undefined && cache.values().length === 0, 'it is not kept');
    const next = await cache.get('u', async () => { loads += 1; return ['server']; });
    check(next?.[0] === 'server' && loads === 2, 'so the next read asks again and gets the real one');
    check((await cache.get('u', once))?.[0] === 'server' && loads === 2, 'which IS kept');
    const nullCache = createSessionCache<string[] | null>({ ttlMs: 60_000, copy: v => (v ? [...v] : null) });
    check((await nullCache.get('u', async () => null)) === null && nullCache.peek('u') === null, 'a confirmed "nothing there" is still a cacheable answer');
  }

  // ---- 4. What may be asked ----
  console.log('# Prompt decisions');
  {
    check(profileKnowledge(undefined) === 'none' && profileKnowledge(null) === 'none', 'no context = the server confirmed there is no profile');
    check(profileKnowledge({}) === 'has' && profileKnowledge({ profileReadFailed: false }) === 'has', 'a context = a saved profile');
    check(profileKnowledge({ profileReadFailed: true }) === 'unknown', 'a failed read = unknown');

    const states: ProfileKnowledge[] = ['has', 'none', 'unknown'];
    for (const profile of states) {
      for (const hasWardrobeFocus of [true, false]) {
        for (const closetCount of [0, 1, 40]) {
          for (const surveyDismissed of [true, false]) {
            const label = `${profile}/focus:${hasWardrobeFocus}/closet:${closetCount}/dismissed:${surveyDismissed}`;
            const p = homePrompts({ profile, hasWardrobeFocus, closetCount, surveyDismissed });
            if (profile === 'unknown') check(!p.survey && !p.department, `${label}: nothing is asked when the profile could not be read`);
            if (profile === 'has') check(!p.survey, `${label}: a member with a profile is never offered the survey`);
            if (closetCount > 0) check(!p.survey, `${label}: a member with clothes in their closet is never offered the survey`);
            if (surveyDismissed) check(!p.survey, `${label}: a declined survey is never offered again`);
            if (profile === 'has') check(p.department === !hasWardrobeFocus, `${label}: the department question is asked exactly when it is unanswered`);
            check(!(p.survey && p.department), `${label}: never both at once`);
            if (profile === 'none') check(p.survey || p.department, `${label}: an account with no profile is asked exactly one thing`);
          }
        }
      }
    }
    const fresh = homePrompts({ profile: 'none', hasWardrobeFocus: false, closetCount: 0, surveyDismissed: false });
    check(fresh.survey && !fresh.department, 'only a confirmed-new, empty account that has not declined is offered the survey');

    check(!departmentQuestionDue('unknown', false) && !departmentQuestionDue('has', true) && !departmentQuestionDue('none', true), 'the inline department question is not shown on a failed read or once answered');
    check(departmentQuestionDue('has', false) && departmentQuestionDue('none', false), 'and is shown when the answer is confirmed missing');
    check(profileInviteDue('none', 0), 'the profile invitation is for a confirmed-new, empty account');
    check(
      !profileInviteDue('none', 3) && !profileInviteDue('none', undefined) && !profileInviteDue('unknown', 0) && !profileInviteDue('has', 0),
      'and for nobody else: not with clothes, not before the closet is read, not on a failed read, not with a profile'
    );
  }

  // ---- 5. Wiring ----
  console.log('# The department is not asked for twice');
  const quiz = (bodyType: string) => ({ bodyAnalysis: { bodyType } });
  check(departmentFromProfile(quiz('hourglass'))?.focus === 'womens' && departmentFromProfile(quiz('pear'))?.focus === 'womens', 'a womenswear body type in the questionnaire settles the department');
  check(departmentFromProfile(quiz('mTrapezoid'))?.focus === 'mens' && departmentFromProfile(quiz('mOval'))?.focus === 'mens', 'a menswear body type settles it too');
  check(departmentFromProfile({ fitPreferences: { highlight: ['shoulders', 'bust'], downplay: ['hips'] } })?.focus === 'womens', 'so do the fit areas a womenswear body type leaves behind ("bust")');
  check(departmentFromProfile({ fitPreferences: { highlight: ['shoulders', 'chest'], downplay: ['waist'] } }) === undefined && departmentFromProfile({}) === undefined && departmentFromProfile(null) === undefined && departmentFromProfile(quiz('somethingElse')) === undefined, 'areas both departments share, or no body type at all, settle nothing');
  const closetOf = (...names: Array<[string, string]>) => names.map(([name, category]) => ({ name, category }));
  check(departmentFromCloset(closetOf(['Straight Jeans', 'bottoms'], ['Floral Wrap Dress', 'dresses']))?.focus === 'womens', 'one dress in the closet settles it');
  check(departmentFromCloset(closetOf(['White Tee', 'tops'], ['Pleated Midi Skirt', 'bottoms']))?.focus === 'womens' && departmentFromCloset(closetOf(['Silk Blouse', 'tops']))?.focus === 'womens', 'so does a skirt or a blouse');
  check(departmentFromCloset(closetOf(['Straight Jeans', 'bottoms'], ["Men's Oxford Shirt", 'tops']))?.focus === 'mens', "so does a piece that says men's");
  check(departmentFromCloset(closetOf(['Straight Jeans', 'bottoms'], ['White Tee', 'tops'], ['Leather Sneakers', 'shoes'])) === undefined && departmentFromCloset([]) === undefined && departmentFromCloset(null) === undefined, 'jeans, tees and trainers settle nothing');
  check(departmentFromCloset(closetOf(['Pleated Midi Skirt', 'bottoms'], ["Men's Oxford Shirt", 'tops'])) === undefined, 'a closet that points both ways settles nothing: that member is asked');
  check(inferDepartment(quiz('mRectangle'), closetOf(['Floral Wrap Dress', 'dresses']))?.focus === 'mens', "the questionnaire's own answer outranks the closet");
  // What Home then does with it: a settled department means no question.
  check(!homePrompts({ profile: 'has', hasWardrobeFocus: true, closetCount: 4, surveyDismissed: false }).department && homePrompts({ profile: 'has', hasWardrobeFocus: false, closetCount: 4, surveyDismissed: false }).department, 'Home asks only an account with no department at all');
  const settleSource = read('src/services/profileMatchContext.ts');
  check(/const wardrobeFocus = savedProfile\.wardrobeFocus \?\? \(await settleWardrobeFocus\(userId, savedProfile\)\);/.test(settleSource), "a saved answer is used as it is; only a profile without one is settled from the member's other answers");
  check(/let focus: Focus \| undefined = departmentFromProfile\(savedProfile\)\?\.focus;\s*\n\s*if \(!focus\) focus = await recallWardrobeFocus\(userId\);/.test(settleSource) && /departmentFromCloset\(await closetService\.getAll\(userId\)\)\?\.focus/.test(settleSource), 'body type first, then the department this device last loaded, then the closet');
  check(/saveWardrobeFocus\(userId, focus\)\.catch\(/.test(settleSource), 'a settled department is saved to the profile, so it is never worked out - or asked for - again');
  check(/const settled = await settleWardrobeFocus\(userId, null\);\s*\n\s*return settled \? \{ wardrobeFocus: settled \} : undefined;/.test(settleSource), 'an account with clothes but no profile is settled from its closet too');
  const builder = read('src/screens/StyleProfileBuilderScreen.tsx');
  check(/if \(currentStep === 'wardrobe' && departmentMissing\) return;/.test(builder) && /if \(departmentMissing\) \{\s*\n\s*setCurrentStep\('wardrobe'\);/.test(builder), 'the questionnaire cannot be passed or saved without the department');
  check(/const settled = base\.wardrobeFocus \?\? departmentFromProfile\(\{ bodyAnalysis: result \}\)\?\.focus;/.test(read('src/screens/BodyAnalysisScreen.tsx')), 'a body-type result saves the department it implies when the profile has none');

  console.log('# Wiring');
  const firestore = read('src/services/firestore.ts');
  const closetGetAll = firestore.slice(firestore.indexOf('getAll: async'), firestore.indexOf('getById: async'));
  check(/readConfirmed\(\(\) => getDocs\(q\), \(\) => getDocsFromServer\(q\)\)/.test(closetGetAll) && /throw new UnconfirmedReadError/.test(closetGetAll), 'the closet read is confirmed by the server or fails');
  const profileGet = firestore.slice(firestore.indexOf('getStyleProfile: async'), firestore.indexOf('saveStyleProfile: async'));
  check(/readConfirmed\(\(\) => getDoc\(docRef\), \(\) => getDocFromServer\(docRef\)\)/.test(profileGet), 'the style profile read is confirmed by the server');
  check(/if \(confirmed\) return profile;\s*\n[\s\S]*if \(profile\) return uncached\(profile\);\s*\n[\s\S]*throw new UnconfirmedReadError/.test(profileGet), 'an unconfirmed profile is used once if present, and is a failed read if absent - never "no profile"');
  check(!/getDoc\(doc\(db, 'users', userId\)\)/.test(profileGet), 'the profile is not read with a bare getDoc');

  const context = read('src/services/profileMatchContext.ts');
  const failure = context.slice(context.indexOf('} catch (error) {'), context.indexOf('export async function saveWardrobeFocus'));
  check(/profileReadFailed: true \} : \{ profileReadFailed: true \}/.test(failure) && !/: undefined;/.test(failure), 'a failed profile read is always flagged, never returned as "no profile"');
  check(/const profile = await styleProfileService\.getStyleProfile\(userId\);/.test(context.slice(context.indexOf('export async function saveWardrobeFocus'))), 'the department answer is laid over the profile as read (a failed read stops the save)');

  const home = read('src/screens/HomeScreen.tsx');
  check(/homePrompts\(\{\s*\n\s*profile: profileKnowledge\(matchContext\),/.test(home) && /closetCount: items\.length,/.test(home), 'Home decides its prompts through homePrompts, with the real closet count');
  check(!/!dismissed && !matchContext/.test(home) && !/setShowProfilePrompt\(true\)/.test(home), 'Home has no other way to switch the survey offer on');
  check(/setShowProfilePrompt\(prompts\.survey\);\s*\n\s*setNeedsWardrobeFocus\(prompts\.department\);/.test(home), 'both prompts come from the one decision');

  const surveyOpeners: string[] = [];
  const builderForDepartment: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const rel = path.relative(path.join(__dirname, '..'), full).replace(/\\/g, '/');
        const opens = (text.match(/navigate\('ProfileSurvey'\)/g) || []).length;
        if (opens) surveyOpeners.push(`${rel}x${opens}`);
        if (/Choose in your style profile/.test(text)) builderForDepartment.push(rel);
      }
    }
  };
  walk(path.join(__dirname, '../src'));
  check(surveyOpeners.join() === 'src/screens/HomeScreen.tsxx1', `the survey is opened from exactly one place, Home's offer (${surveyOpeners.join(', ')})`);
  check(builderForDepartment.length === 0, `no screen sends a member to the profile builder to answer the department question (${builderForDepartment.join(', ')})`);

  const shop = read('src/screens/ShopScreen.tsx');
  check(/departmentQuestionDue\(profileState, !!wardrobeFocus\)/.test(shop) && /saveWardrobeFocus\(getCurrentUserId\(\), focus\)/.test(shop), 'Shop asks the department question in place, in one tap, only when confirmed missing');
  check(!/navigate\('StyleProfileBuilder'\)/.test(shop), 'Shop no longer opens the profile builder');

  const chat = read('src/screens/StylingAssistantScreen.tsx');
  check(/useState<ProfileKnowledge>\('unknown'\)/.test(chat) && /profileInviteDue\(profileState, closetCount\) \?/.test(chat), 'the stylist invites a profile only for a confirmed-new, empty account');
  check(!/\) : \(\s*\n\s*<TouchableOpacity\s*\n\s*style=\{styles\.contextStripPrompt\}/.test(chat), 'and no longer shows the invitation by default while loading');

  const auth = read('src/contexts/AuthContext.tsx');
  check(/if \(!user\) setIsNewUser\(false\);\s*\n\s*setUser\(user\);/.test(auth), 'signing out clears the first-run flag, so the next account is not treated as new');
  const navigator = read('src/navigation/AppNavigator.tsx');
  check(/\{user && isNewUser \? \(/.test(navigator), 'the first-run survey is still reached only by a just-created account');

  console.log(`\n${checks} checks.`);
  if (failures) {
    console.log(`${failures} failure(s).`);
    process.exit(1);
  }
  console.log('OK - a member with a profile or a closet is never asked for the survey, and a failed read asks nothing.');
  process.exit(0);
})();
