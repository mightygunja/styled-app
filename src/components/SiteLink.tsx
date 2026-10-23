/**
 * An in-app navigation link that is a real <a href> on the web.
 *
 * Every public page is pre-rendered for crawlers (scripts/prerender), but a
 * TouchableOpacity that calls navigation.navigate is a <div> with no href,
 * so the static HTML carried no path from one page to the next - Google
 * could only reach the guides through the sitemap. React Navigation's Link
 * renders an anchor whose href comes from the linking config, and still
 * navigates in-app on tap (web or native) without a page reload.
 *
 * Use it for every link between public pages; keep TouchableOpacity for
 * actions that are not navigation.
 */

import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Link } from '@react-navigation/native';

interface Props {
  screen: string;
  params?: Record<string, unknown>;
  /** Overrides the href the linking config would derive (e.g. "/" for the home page). */
  href?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  numberOfLines?: number;
  children: React.ReactNode;
}

export default function SiteLink({ screen, params, href, style, accessibilityLabel, numberOfLines, children }: Props) {
  // Link paints the navigator theme's primary colour unless overridden, so
  // the caller's style always wins; the font is set by the caller too.
  const LinkAny = Link as any;
  return (
    <LinkAny
      screen={screen}
      params={params}
      href={href}
      style={style}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
    >
      {children}
    </LinkAny>
  );
}
