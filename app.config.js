/**
 * Expo config.
 *
 * app.json remains the source of truth for everything static; this file layers
 * on the pieces that depend on environment values.
 *
 * The Facebook plugin is added ONLY when both EXPO_PUBLIC_FACEBOOK_APP_ID and
 * EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN are set. That is deliberate: the native
 * plugin fails the iOS build outright if given an empty app id, so a missing
 * Facebook config should mean "no Facebook button" rather than "no build".
 * AuthContext checks the same variables and surfaces a clear message if the
 * button is somehow reached without them.
 *
 * Neither value is a secret - both ship inside any Facebook-enabled app and
 * are visible to anyone who inspects the bundle. They live in env purely so
 * this repo does not hard-code one project's identifiers.
 */

const appJson = require('./app.json');

const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;

module.exports = ({ config }) => {
  const base = { ...appJson.expo, ...config };
  const plugins = [...(base.plugins || [])];

  if (facebookAppId && facebookClientToken) {
    plugins.push([
      'react-native-fbsdk-next',
      {
        appID: facebookAppId,
        clientToken: facebookClientToken,
        displayName: 'Styled',
        // Facebook requires the URL scheme to be exactly fb<APP_ID> so the
        // native SDK can receive the login redirect back.
        scheme: `fb${facebookAppId}`,
        // Off by default. Both of these collect data on the user's behalf, and
        // turning them on without asking would be a privacy decision made for
        // the user rather than by them.
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
        isAutoInitEnabled: true,
        // No ATT prompt: nothing here tracks users across other apps, and
        // showing the prompt without needing it is a review risk.
        iosUserTrackingPermission: false,
      },
    ]);
  }

  return { ...base, plugins };
};
