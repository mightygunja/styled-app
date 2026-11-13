/**
 * One tap on a product, straight to its store.
 *
 * For surfaces where the piece is the point and a page of details in between
 * is in the way (Home's starter looks). The product is re-read first - a
 * live product's price, stock and buy link are refreshed when it is opened,
 * exactly as the product page does - and then the store opens:
 *
 *   - on the web the new tab is opened in the same instant as the tap and
 *     pointed at the store once the link is known. A tab opened after a
 *     wait is treated as a pop-up and blocked; this one is not;
 *   - in the app the store opens as soon as the link is known.
 *
 * Returns false when the store could not be opened (the product is gone or
 * sold out, the browser refused the tab, no link): the caller then shows the
 * product page instead, which can say why. Never a dead tap.
 *
 * The click is recorded the same way the product page records one.
 */

import { Linking, Platform } from 'react-native';
import { activeProviderName, getActiveAdapter } from './affiliateNetwork';
import { affiliateClicksService, AffiliateSurface } from './firestore';
import { getCurrentUserId } from './api';
import { shopperSignals } from './shopperSignals';

export async function openAtStore(
  productId: string,
  attribution: { surface: AffiliateSurface; reason?: string }
): Promise<boolean> {
  const onWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  // Opened now, inside the tap; filled in below.
  const tab = onWeb ? window.open('', '_blank') : null;
  if (onWeb && !tab) return false;
  const giveUp = () => {
    try {
      tab?.close();
    } catch {
      /* nothing to close */
    }
    return false;
  };

  try {
    const adapter = getActiveAdapter();
    const product = await adapter.getById(productId);
    if (!product || product.inStock === false) return giveUp();
    const url = await adapter.wrapLink(product);
    if (!url) return giveUp();

    if (tab) {
      // The store must not be able to reach back into this page.
      tab.opener = null;
      tab.location.href = url;
    } else {
      await Linking.openURL(url);
    }

    // Logging never gates the link: fired after the open, and a failed write
    // is swallowed.
    affiliateClicksService
      .record(getCurrentUserId(), product, {
        surface: attribution.surface,
        reason: attribution.reason,
        provider: activeProviderName(),
      })
      .catch(error => console.error('Error recording affiliate click:', error));
    shopperSignals.recordTap(product).catch(() => {});
    return true;
  } catch (error) {
    console.error('Could not open the store:', error);
    return giveUp();
  }
}
