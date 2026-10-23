/**
 * The crawlable footer every public page ends with: home, the trend page,
 * every guide, press, and the legal pages, all as real links (SiteLink), so
 * the pre-rendered HTML of any one public page leads to all the others.
 * Before this, the only anchors in the static pages were the shop buttons
 * and Google could reach the guides only through the sitemap.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SiteLink from './SiteLink';
import { GUIDES } from '../data/guides';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

export default function PublicFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.label}>STYLE GUIDES</Text>
      <View style={styles.row}>
        <SiteLink screen="Trending" style={styles.link}>What’s in style now</SiteLink>
        {GUIDES.map(guide => (
          <SiteLink key={guide.route} screen={guide.route} style={styles.link}>
            {guide.label}
          </SiteLink>
        ))}
      </View>
      <View style={styles.row}>
        {/* The home page is "/" for a crawler; in-app it is wherever the
            logged-out stack starts (Login once the intro has been seen). */}
        <SiteLink screen="Login" href="/" style={styles.legal}>33 TRENDS</SiteLink>
        <Text style={styles.dot}>·</Text>
        <SiteLink screen="About" style={styles.legal}>ABOUT</SiteLink>
        <Text style={styles.dot}>·</Text>
        <SiteLink screen="Press" style={styles.legal}>PRESS</SiteLink>
        <Text style={styles.dot}>·</Text>
        <SiteLink screen="Privacy" style={styles.legal}>PRIVACY</SiteLink>
        <Text style={styles.dot}>·</Text>
        <SiteLink screen="Terms" style={styles.legal}>TERMS</SiteLink>
      </View>
      <Text style={styles.copy}>© 2026 33 Trends · support@thirtythreetrends.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.lg,
    gap: 12,
  },
  label: { ...textType.eyebrow, color: colors.inkFaint },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 18, rowGap: 8 },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },
  legal: { ...textType.eyebrow, color: colors.ink },
  dot: { fontFamily: fonts.sans, color: colors.inkFaint },
  copy: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint },
});
