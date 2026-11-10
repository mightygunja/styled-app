/**
 * The animated card stack at the top of the Login page.
 *
 * Native: the implementation itself (LoginHeroImpl.tsx), bundled as always.
 * Web (LoginHero.web.tsx): loaded just after the page, because it is the only
 * thing on the web that needs Reanimated and gesture-handler.
 */
export { default } from './LoginHeroImpl';
