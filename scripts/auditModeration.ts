/**
 * Audit: Community can be reported, blocked and filtered - what App Review
 * requires of any app with other people's words in it (guideline 1.2).
 *
 *   npx tsx scripts/auditModeration.ts
 *
 * Runs the real rules (src/services/moderation.ts) and reads the services,
 * screens, server functions and database rules that apply them. No network.
 */

import fs from 'fs';
import path from 'path';
import {
  FILTER_MESSAGE,
  NO_MODERATION,
  NotAllowedError,
  REPORTS_TO_HIDE,
  REPORT_REASONS,
  assertAllowed,
  blockDocId,
  isNotAllowed,
  isVisible,
  reportDocId,
  reportKey,
  screenText,
  shouldHide,
  visibleOnly,
} from '../src/services/moderation';

let checks = 0;
let failures = 0;
function check(ok: boolean, label: string) {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${label}`);
}
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
const refused = (text: string) => !screenText(text).ok;

console.log('# Filter');
const ordinary = ['Love this camel coat with the loafers', 'Is the blazer true to size?', 'That dress is killer on you', 'Assessing my wardrobe class by class', 'Cocktail dress for a wedding in Scunthorpe', 'What the hell do I wear to this', 'A pussy-bow blouse, or two pussybow blouses', 'Nudes and neutrals for spring', 'A spicy mustard knit', 'Raccoon-collar coat, cocoon shape, peacock blue', 'Draped skirt with a grape cardigan', 'Dickies work trousers'];
check(ordinary.filter(refused).length === 0, `ordinary talk about clothes is allowed, fashion's own words included (${ordinary.filter(refused).join(' | ') || 'none refused'})`);
check(refused('you stupid bitch') && refused('what a fucking mess') && refused('this is bullshit'), 'strong profanity is refused');
check(refused('go back, you f4ggot') && refused('typical r3tard') && refused('N1GGER'), 'slurs are refused, with digits swapped in for letters too');
check(refused('send nudes') && refused('send me nudes') && refused('check my onlyfans') && refused('p0rn link in bio'), 'explicit sexual language is refused');
check(refused('kill yourself') && refused('kys') && refused("I'll kill you") && refused('hope you die'), 'threats and telling someone to harm themselves are refused');
check(refused('f u c k off') && refused('f.u.c.k') && refused('fuuuuuck this') && refused('sh1t outfit'), 'spacing, punctuation and stretched letters do not get a word through');
check(!refused('') && !refused('   ') && !refused(undefined as any), 'an empty post is not the filter\'s business');
check(screenText('fuck').ok === false && (screenText('fuck') as any).message === FILTER_MESSAGE && /community rules/.test(FILTER_MESSAGE), 'a refusal says why, in words a member can act on');
let thrown: unknown;
try {
  assertAllowed('you bitch');
} catch (error) {
  thrown = error;
}
check(thrown instanceof NotAllowedError && isNotAllowed(thrown) && !isNotAllowed(new Error('network')) && !isNotAllowed(null), 'the services refuse with an error a screen can tell apart from a failure');

console.log('# What a member sees');
const me = 'me';
const state = { blocked: new Set(['troll']), reported: new Set([reportKey('post', 'p-reported'), reportKey('comment', 'c-reported')]) };
const post = (id: string, ownerId: string, hidden?: boolean) => ({ type: 'post' as const, id, ownerId, hidden });
check(isVisible(post('p1', 'friend'), me, state) && isVisible(post('p1', 'friend'), me, NO_MODERATION), 'an ordinary post is shown');
check(!isVisible(post('p2', 'troll'), me, state), 'a post by a member the viewer blocked is not shown');
check(!isVisible(post('p-reported', 'friend'), me, state) && !isVisible({ type: 'comment', id: 'c-reported', ownerId: 'friend' }, me, state), 'something the viewer reported is not shown to them again');
check(isVisible({ type: 'comment', id: 'p-reported', ownerId: 'friend' }, me, state), 'a report is for one thing: a comment that shares an id with a reported post is still shown');
check(!isVisible(post('p3', 'friend', true), me, NO_MODERATION), 'a post hidden after reports is not shown to anyone else');
check(isVisible(post('p4', me, true), me, state) && isVisible(post('p-reported', me), me, state), 'an author always sees their own content, hidden or not, so they can delete it');
const list = [post('a', 'friend'), post('b', 'troll'), post('c', 'friend', true), post('d', me, true), post('p-reported', 'friend'), post('e', 'other')];
check(visibleOnly(list, p => p, me, state).map(p => p.id).join() === 'a,d,e', 'a list keeps its order and loses only what must not be shown');
check(visibleOnly(list, p => p, me, NO_MODERATION).map(p => p.id).join() === 'a,b,d,p-reported,e', 'with nothing blocked or reported, only server-hidden posts are left out');

console.log('# Reports and blocks');
check(REPORT_REASONS.length >= 5 && REPORT_REASONS.some(r => r.key === 'harassment') && REPORT_REASONS.some(r => r.key === 'hate') && REPORT_REASONS.some(r => r.key === 'sexual') && REPORT_REASONS.some(r => r.key === 'spam') && REPORT_REASONS.some(r => r.key === 'other') && new Set(REPORT_REASONS.map(r => r.key)).size === REPORT_REASONS.length, 'a report names a reason from a fixed list, with "something else" for the rest');
check(reportDocId('u1', 'post', 'p9') === 'u1_post_p9' && reportDocId('u1', 'post', 'p9') === reportDocId('u1', 'post', 'p9') && reportDocId('u1', 'comment', 'p9') !== reportDocId('u1', 'post', 'p9') && blockDocId('u1', 'u2') === 'u1_u2' && blockDocId('u1', 'u2') !== blockDocId('u2', 'u1'), 'one report per member per thing and one block per pair: reporting twice is the same report');
check(REPORTS_TO_HIDE === 3 && !shouldHide(['a', 'b']) && !shouldHide(['a', 'a', 'a', 'b']) && shouldHide(['a', 'b', 'c']) && !shouldHide(['', '', '']), 'three DIFFERENT members reporting hides a thing; one member cannot do it alone');

console.log('# Saved before shown');
const feed = read('src/services/socialFeedService.ts');
const createPost = feed.slice(feed.indexOf('async createPost('), feed.indexOf('async getPostById('));
check(createPost.indexOf('assertAllowed([caption, ...hashtags].join(\' \'))') > -1 && createPost.indexOf('assertAllowed(') < createPost.indexOf('addDoc('), 'a post is screened - caption and hashtags - before it is saved');
const addComment = feed.slice(feed.indexOf('async addComment('), feed.indexOf('async getPostComments('));
check(addComment.indexOf('assertAllowed(text)') > -1 && addComment.indexOf('assertAllowed(text)') < addComment.indexOf('addDoc('), 'a comment is screened before it is saved');
const messaging = read('src/services/messagingService.ts');
const send = messaging.slice(messaging.indexOf('async sendMessage('), messaging.indexOf('async markAsRead('));
check(send.indexOf('assertAllowed(content)') > -1 && send.indexOf('assertAllowed(content)') < send.indexOf('addDoc(') && send.indexOf('moderationService.isBlockedBy(senderId, other)') > -1 && send.indexOf('isBlockedBy') < send.indexOf('addDoc('), 'a message is screened, and refused when the other member has blocked the sender, before it is saved');
check(/assertAllowed\(`\$\{name\} \$\{description\}`\)/.test(read('src/services/groupService.ts')), "a group's name and description are screened too");

console.log('# Filtered for the viewer');
check(/private async visiblePosts\(posts: Post\[\], viewerId: string\)/.test(feed) && (feed.match(/this\.visiblePosts\(/g) || []).length >= 4, 'the feed, the personalised feed, hashtag results and other members\' profiles all drop what the viewer must not see');
check(/async getPostComments\(postId: string, viewerId\?: string\)/.test(feed) && /type: 'comment', id: comment\.id, ownerId: comment\.userId/.test(feed), 'comments and replies are filtered the same way');
check(/blocked\.has\(id\)/.test(messaging) && /reported\.has\(reportKey\('message', message\.id\)\)/.test(messaging), 'a conversation with a blocked member is not listed, and a reported message is not shown again');
check(/!blocked\.has\(e\.userId\) && !reported\.has\(reportKey\('post',/.test(read('src/services/challengeService.ts')), 'challenge entries are filtered too');

console.log('# In reach of every member');
const postPage = read('src/screens/PostDetailScreen.tsx');
check(/setReporting\(\{ type: 'post', id: post\.id, ownerId: post\.userId, subject: 'this post' \}\)/.test(postPage) && /setReporting\(\{ type: 'comment', id: comment\.id, ownerId: comment\.userId, subject: 'this comment' \}\)/.test(postPage) && /<ReportModal/.test(postPage) && !/mailto:/.test(postPage), 'a post and each comment under it can be reported in the app - no longer by writing an email');
check(/moderationService\.block\(getCurrentUserId\(\), post\.userId\)/.test(postPage) && /Block \{post\.user\?\.displayName \|\| 'member'\}/.test(postPage), "a post's author can be blocked from the post");
check(/isVisible\(\s*\{ type: 'post', id: foundPost\.id, ownerId: foundPost\.userId, hidden: foundPost\.hidden \}/.test(postPage), 'a hidden, blocked or reported post is not opened by its link either');
const profile = read('src/screens/UserProfileScreen.tsx');
check(/moderationService\.block\(getCurrentUserId\(\), userId\)/.test(profile) && /moderationService\.unblock\(getCurrentUserId\(\), userId\)/.test(profile) && /type: 'user', id: userId, ownerId: userId/.test(profile) && /\{!isOwnProfile && \(/.test(profile), "every other member's profile offers Block (or Unblock) and Report");
const thread = read('src/screens/ChatScreen.tsx');
check(/type: 'message', id: message\.id, ownerId: message\.senderId/.test(thread) && /type: 'user', id: otherUser\.userId/.test(thread) && /moderationService\.block\(getCurrentUserId\(\), otherUser\.userId\)/.test(thread) && /Long-press a message to report it/.test(thread), 'a message thread offers Report and Block, and a single message is reported by long-pressing it');
check(/isNotAllowed\(error\) \? error\.message/.test(postPage) && /isNotAllowed\(error\) \? error\.message/.test(thread) && /isNotAllowed\(error\) \? error\.message/.test(read('src/screens/CreatePostScreen.tsx')) && /isNotAllowed\(error\) \? error\.message/.test(read('src/screens/GroupsScreen.tsx')), 'a refused post, comment, message or group says why instead of "failed"');
const feedScreen = read('src/screens/SocialFeedScreen.tsx');
check(/moderationService\.subscribe\(async \(\) => \{/.test(feedScreen) && /setPosts\(current =>\s*\n\s*visibleOnly\(current,/.test(feedScreen), 'a report or block takes the post out of a feed that is already on screen');
const nav = read('src/navigation/AppNavigator.tsx');
check(/name="BlockedMembers" component=\{BlockedMembersScreen\}/.test(nav) && /navigation\.navigate\('BlockedMembers'\)/.test(read('src/screens/SettingsScreen.tsx')) && /moderationService\.unblock\(getCurrentUserId\(\), member\.userId\)/.test(read('src/screens/BlockedMembersScreen.tsx')), 'Settings lists the members someone has blocked, with Unblock');
const sheet = read('src/components/ReportModal.tsx');
check(/REPORT_REASONS\.map\(reason =>/.test(sheet) && /onPress=\{\(\) => onChoose\(reason\.key\)\}/.test(sheet) && /usually within 24 hours/.test(sheet), 'the report sheet is one tap on a reason, and says what happens next');

console.log('# Acted on');
const service = read('src/services/moderationService.ts');
check(/doc\(db, 'contentReports', reportDocId\(reporterId, target\.type, target\.id\)\)/.test(service) && /status: 'open'/.test(service) && /this\.cache\.reported\.add\(reportKey\(target\.type, target\.id\)\)/.test(service), 'a report is saved for the admin queue and hides the thing from the reporter at once');
check(/doc\(db, 'blocks', blockDocId\(blockerId, blockedId\)\)/.test(service) && /userProfileService\.unfollowUser\(blockerId, blockedId\)/.test(service), 'a block is saved, and the blocker stops following the member they blocked');
check(/console\.error\('Could not load blocks and reports:', error\);\s*\n\s*return NO_MODERATION;/.test(service), 'a failed read of blocks and reports never empties or breaks a feed');
const fn = read('functions/src/index.ts');
const trigger = fn.slice(fn.indexOf('export const onContentReported'), fn.indexOf('export const listContentReports'));
check(/\.document\('contentReports\/\{reportId\}'\)/.test(trigger) && /if \(reporters\.size < REPORTS_TO_HIDE\) return;/.test(trigger) && /\.update\(\{ hidden: true, hiddenAt:/.test(trigger) && /const REPORTS_TO_HIDE = 3;/.test(fn), 'the server hides a post or comment once three different members have reported it');
const queue = fn.slice(fn.indexOf('export const listContentReports'), fn.indexOf('export const resolveContentReport'));
const resolve = fn.slice(fn.indexOf('export const resolveContentReport'));
check(/requireAdmin\(context\);/.test(queue) && /const adminId = requireAdmin\(context\);/.test(resolve), 'the report queue and its decisions are for admins only, checked on the server');
check(/await admin\.auth\(\)\.updateUser\(targetId, \{ disabled: true \}\);/.test(resolve) && /await db\.collection\(collection\)\.doc\(targetId\)\.delete\(\);/.test(resolve) && /\.update\(\{ hidden: false \}\)/.test(resolve) && /status: action === 'remove' \? 'removed' : 'dismissed'/.test(resolve), 'an admin can remove the content, suspend the member, or keep it - and every report on the same thing is closed with that decision');
check(/name="AdminReports" component=\{AdminReportsScreen\}/.test(nav) && /route: 'AdminReports'/.test(read('src/screens/AdminScreen.tsx')) && /moderationService\.resolveReport\(report\.id, action\)/.test(read('src/screens/AdminReportsScreen.tsx')), 'the admin area has a Reports queue with Remove and Keep');

console.log('# Database rules');
const rules = read('firestore.rules');
const reportsRule = rules.slice(rules.indexOf('match /contentReports/{reportId}'), rules.indexOf('match /blocks/{blockId}'));
const blocksRule = rules.slice(rules.indexOf('match /blocks/{blockId}'));
check(/request\.resource\.data\.reporterId == request\.auth\.uid/.test(reportsRule) && /reportId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.targetType \+ '_' \+ request\.resource\.data\.targetId/.test(reportsRule) && /allow update, delete: if false;/.test(reportsRule) && /allow read: if isAuthenticated\(\) && resource\.data\.reporterId == request\.auth\.uid;/.test(reportsRule), 'a member can file a report only in their own name, once per thing, read only their own, and never change one');
check(/request\.resource\.data\.blockerId == request\.auth\.uid/.test(blocksRule) && /blockId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.blockedId/.test(blocksRule) && /allow delete: if isAuthenticated\(\) && resource\.data\.blockerId == request\.auth\.uid;/.test(blocksRule), 'only the blocker can make or undo a block');
check((rules.match(/!request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(\['hidden', 'hiddenAt'\]\)/g) || []).length === 2, 'an author cannot un-hide their own post or comment once reports have hidden it');

console.log('# Said in the open');
const terms = read('src/screens/PublicPagesScreens.tsx');
check(/<Section heading="Community rules">/.test(terms) && /no tolerance for objectionable content or abusive members/.test(terms) && /normally within 24 hours/.test(terms) && /\{CONTACT_EMAIL\}/.test(terms), 'the Terms state the community rules, that there is no tolerance for objectionable content, and how to reach a person');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - what members post is filtered, anything can be reported in the app, anyone can be blocked, and reports reach an admin who can act.');
