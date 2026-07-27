import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.favoriteLook.deleteMany({});
  await prisma.lookItem.deleteMany({});
  await prisma.look.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.trendPalette.deleteMany({});
  console.log('✅ Cleared existing data');

  // Create trend palettes
  const quietSaffron = await prisma.trendPalette.create({
    data: {
      name: 'Quiet Saffron',
      description: 'Warm, earthy tones with golden accents perfect for cozy autumn days',
      colors: ['#F4A460', '#FFD700', '#FFA500', '#DEB887', '#CD853F'],
      occasion: 'home',
      weekStartDate: new Date(),
      isActive: true,
    },
  });

  const charcoalDenim = await prisma.trendPalette.create({
    data: {
      name: 'Charcoal Denim',
      description: 'Professional blues and grays for the modern workplace',
      colors: ['#36454F', '#4682B4', '#708090', '#2F4F4F', '#5F9EA0'],
      occasion: 'work',
      weekStartDate: new Date(),
      isActive: true,
    },
  });

  const silverAccents = await prisma.trendPalette.create({
    data: {
      name: 'Silver Accents',
      description: 'Metallic and neutral tones for elegant evening looks',
      colors: ['#C0C0C0', '#E8E8E8', '#A9A9A9', '#D3D3D3', '#B0C4DE'],
      occasion: 'going-out',
      weekStartDate: new Date(),
      isActive: true,
    },
  });

  console.log('✅ Created 3 trend palettes');

  // Create sample items
  const items = await Promise.all([
    // Home items
    prisma.item.create({
      data: {
        name: 'Cozy Oversized Sweater',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
        price: 45.00,
        retailer: 'Nordstrom',
        affiliateLink: 'https://www.nordstrom.com/browse/women/clothing/sweaters',
        category: 'tops',
        color: 'Saffron',
        sizeRange: ['XS', 'S', 'M', 'L', 'XL'],
        brand: 'Free People',
        inStock: true,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Soft Lounge Pants',
        imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        price: 32.00,
        retailer: 'Target',
        affiliateLink: 'https://www.target.com/c/women-s-pants/-/N-5xtd6',
        category: 'bottoms',
        color: 'Cream',
        sizeRange: ['XS', 'S', 'M', 'L', 'XL'],
        brand: 'Universal Thread',
        inStock: true,
      },
    }),
    // Work items
    prisma.item.create({
      data: {
        name: 'Tailored Blazer',
        imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        price: 89.00,
        originalPrice: 120.00,
        retailer: 'J.Crew',
        affiliateLink: 'https://www.jcrew.com/c/womens/categories/clothing/blazers',
        category: 'outerwear',
        color: 'Charcoal',
        sizeRange: ['0', '2', '4', '6', '8', '10', '12'],
        brand: 'J.Crew',
        inStock: true,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Classic White Button-Down',
        imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400',
        price: 42.00,
        retailer: 'Everlane',
        affiliateLink: 'https://www.everlane.com/collections/womens-tops',
        category: 'tops',
        color: 'White',
        sizeRange: ['XXS', 'XS', 'S', 'M', 'L', 'XL'],
        brand: 'Everlane',
        inStock: true,
      },
    }),
    prisma.item.create({
      data: {
        name: 'High-Waisted Trousers',
        imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        price: 68.00,
        retailer: 'Banana Republic',
        affiliateLink: 'https://www.bananarepublic.com/browse/category.do?cid=1014914',
        category: 'bottoms',
        color: 'Navy',
        sizeRange: ['00', '0', '2', '4', '6', '8', '10', '12'],
        brand: 'Banana Republic',
        inStock: true,
      },
    }),
    // Going out items
    prisma.item.create({
      data: {
        name: 'Sequin Mini Dress',
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
        price: 125.00,
        retailer: 'Revolve',
        affiliateLink: 'https://www.revolve.com/dresses/br/7b6c1c/',
        category: 'dresses',
        color: 'Silver',
        sizeRange: ['XS', 'S', 'M', 'L'],
        brand: 'NBD',
        inStock: true,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Strappy Heeled Sandals',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
        price: 78.00,
        retailer: 'Steve Madden',
        affiliateLink: 'https://www.stevemadden.com/collections/womens-heels',
        category: 'shoes',
        color: 'Silver',
        sizeRange: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
        brand: 'Steve Madden',
        inStock: true,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Statement Clutch',
        imageUrl: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400',
        price: 45.00,
        retailer: 'Zara',
        affiliateLink: 'https://www.zara.com/us/en/woman-bags-l1024.html',
        category: 'bags',
        color: 'Silver',
        sizeRange: ['One Size'],
        brand: 'Zara',
        inStock: true,
      },
    }),
  ]);

  console.log(`✅ Created ${items.length} items`);

  // Create looks
  const homeLook = await prisma.look.create({
    data: {
      title: 'Cozy Weekend Vibes',
      description: 'Perfect for lazy Sundays and Netflix marathons',
      occasion: 'home',
      paletteId: quietSaffron.id,
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
      tags: ['casual', 'comfortable', 'weekend'],
      items: {
        create: [
          { itemId: items[0].id, itemType: 'hero' },
          { itemId: items[1].id, itemType: 'alternate' },
        ],
      },
    },
  });

  const workLook = await prisma.look.create({
    data: {
      title: 'Power Professional',
      description: 'Command the boardroom with confidence',
      occasion: 'work',
      paletteId: charcoalDenim.id,
      imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600',
      tags: ['professional', 'business', 'formal'],
      items: {
        create: [
          { itemId: items[2].id, itemType: 'hero' },
          { itemId: items[3].id, itemType: 'alternate' },
          { itemId: items[4].id, itemType: 'alternate' },
        ],
      },
    },
  });

  const goingOutLook = await prisma.look.create({
    data: {
      title: 'Night Out Glamour',
      description: 'Turn heads at your next evening event',
      occasion: 'going-out',
      paletteId: silverAccents.id,
      imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600',
      tags: ['glamorous', 'evening', 'party'],
      items: {
        create: [
          { itemId: items[5].id, itemType: 'hero' },
          { itemId: items[6].id, itemType: 'alternate' },
          { itemId: items[7].id, itemType: 'alternate' },
        ],
      },
    },
  });

  // Add more looks to same palettes so palette section shows mini cards
  await prisma.look.create({
    data: {
      title: 'Brunch Ready',
      description: 'Effortlessly chic for weekend brunch with friends',
      occasion: 'home',
      paletteId: quietSaffron.id,
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
      tags: ['casual', 'brunch', 'weekend'],
      items: {
        create: [
          { itemId: items[0].id, itemType: 'hero' },
        ],
      },
    },
  });

  await prisma.look.create({
    data: {
      title: 'Business Casual',
      description: 'Perfect for client meetings and presentations',
      occasion: 'work',
      paletteId: charcoalDenim.id,
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600',
      tags: ['professional', 'smart-casual', 'office'],
      items: {
        create: [
          { itemId: items[2].id, itemType: 'hero' },
        ],
      },
    },
  });

  await prisma.look.create({
    data: {
      title: 'Cocktail Hour',
      description: 'Sophisticated style for evening drinks',
      occasion: 'going-out',
      paletteId: silverAccents.id,
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600',
      tags: ['cocktail', 'elegant', 'evening'],
      items: {
        create: [
          { itemId: items[5].id, itemType: 'hero' },
        ],
      },
    },
  });

  console.log('✅ Created 6 looks');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
