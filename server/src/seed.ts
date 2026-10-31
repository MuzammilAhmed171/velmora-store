import "dotenv/config";
import mongoose from "mongoose";
import { hashPassword } from "./lib/password";
import { User, OtpCode, Address, Referral } from "./models/user";
import { Category, Brand, Product, ProductVariant, Review, Question } from "./models/catalog";
import {
  CartItem, WishlistItem, SavedItem, Coupon, GiftCard, Order, OrderTimeline,
  LoyaltyTxn, WalletTxn, Return, PreOrder, Subscription, DigitalFile, Download, Auction, Bid,
} from "./models/commerce";
import {
  Banner, Faq, BlogPost, Ticket, TicketMessage, FlashDeal, Notification,
  Setting, Campaign, SearchLog, NewsletterSubscriber, SeoMeta, Integration,
} from "./models/content";
import { Seller, Payout, Warehouse, StockItem, ChatThread } from "./models/ops";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/velmora";

// Deterministic PRNG so seed data is stable
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261031);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const round50 = (n: number) => Math.round(n / 50) * 50;

const IMAGES_NOTE = "real bundled photos in client/public/images/products/";

async function wipe() {
  const models: any[] = [
    OrderTimeline, Order, TicketMessage, Ticket, Review, Question, ProductVariant,
    FlashDeal, CartItem, WishlistItem, SavedItem, Product, Category, Brand, Coupon,
    GiftCard, Banner, Faq, BlogPost, Notification, LoyaltyTxn, WalletTxn, Address,
    OtpCode, Setting, User, Auction, Bid, DigitalFile, Download, Subscription,
    PreOrder, Return, Referral, Campaign, SearchLog, NewsletterSubscriber, SeoMeta,
    Integration, Seller, Payout, Warehouse, StockItem, ChatThread,
  ];
  for (const m of models) await m.deleteMany({});
}

const CATEGORIES = [
  { name: "Fashion", slug: "fashion", description: "Clothing, footwear and accessories for men and women." },
  { name: "Electronics", slug: "electronics", description: "Home appliances, gadgets and tech essentials." },
  { name: "Home & Living", slug: "home-living", description: "Everything for a comfortable, beautiful home." },
  { name: "Beauty & Care", slug: "beauty-care", description: "Skincare, haircare and personal care." },
  { name: "Sports & Fitness", slug: "sports-fitness", description: "Sports gear and fitness equipment." },
  { name: "Kids & Baby", slug: "kids-baby", description: "Toys, school essentials and baby care." },
  { name: "Grocery & Essentials", slug: "grocery-essentials", description: "Daily grocery and household essentials." },
];

const BRANDS: Record<string, string[]> = {
  fashion: ["RangReza", "Libaas", "UrbanThread"],
  electronics: ["NovaTech", "VoltEdge", "HomeWatt"],
  "home-living": ["GharSajja", "DecoNest"],
  "beauty-care": ["NoorGlow", "HerbEssence"],
  "sports-fitness": ["KhelPro", "FitTrack"],
  "kids-baby": ["TinyTots", "PlayNest"],
  "grocery-essentials": ["DesiZaiqa", "FarmPure"],
};

// [name, minPrice, maxPrice]
const PRODUCTS: Record<string, [string, number, number][]> = {
  fashion: [
    ["Men's Classic Cotton Kurta", 1499, 2999], ["Women's Lawn 3-Piece Suit", 2499, 4999],
    ["Slim-Fit Denim Jeans", 1999, 3999], ["Running Sneakers", 2999, 5999],
    ["Genuine Leather Wallet", 999, 2499], ["Analog Wrist Watch", 2499, 7999],
    ["UV-Protection Sunglasses", 1299, 3499], ["Women's Handbag", 1999, 4999],
    ["Woolen Shawl", 1499, 3499], ["Pullover Hoodie", 1799, 3499],
    ["Polo T-Shirt (Pack of 2)", 1299, 2499], ["Formal Leather Shoes", 3499, 6999],
    ["Cotton Socks (Pack of 5)", 499, 999], ["Leather Belt", 799, 1799],
    ["Embroidered Kurti", 1899, 3799], ["Abaya with Hijab", 2999, 5999],
    ["Men's Sherwani", 8999, 17999], ["Chiffon Dupatta", 899, 1999],
    ["Canvas Shoes", 1599, 3299], ["Winter Jacket", 3499, 7499],
    ["Linen Shirt", 1799, 3499], ["Palazzo Trousers", 1399, 2799],
    ["Anarkali Frock", 2799, 5499],
  ],
  electronics: [
    ["Air Fryer 5L", 14999, 22999], ["43\" Smart LED TV", 64999, 84999],
    ["Smartphone 8/128GB", 32999, 49999], ["Wireless Earbuds", 3499, 7999],
    ["Laptop 15.6\" Core i5", 94999, 129999], ["Ceiling Fan 56\"", 7999, 12999],
    ["Washing Machine 8kg", 54999, 74999], ["Microwave Oven 20L", 18999, 26999],
    ["Refrigerator 12cft", 74999, 99999], ["Steam Iron", 3499, 6499],
    ["Electric Kettle 1.8L", 2499, 4999], ["Room Air Cooler", 18999, 27999],
    ["Power Bank 20000mAh", 2999, 5999], ["Smart Watch", 4999, 11999],
    ["Bluetooth Speaker", 3499, 8999], ["Hair Dryer 2000W", 2799, 5499],
    ["Vacuum Cleaner", 12999, 19999], ["Water Dispenser", 14999, 22999],
    ["UPS 1.2KVA", 24999, 34999], ["Android Tablet 10\"", 27999, 42999],
    ["Mechanical Keyboard", 5999, 11999], ["Pedestal Fan", 6499, 9999],
    ["Camera Drone with 4K", 15999, 29999],
  ],
  "home-living": [
    ["Cotton Bed Sheet Set (3pc)", 1999, 3999], ["Dinner Set 72 Pieces", 8999, 14999],
    ["Non-Stick Cookware Set", 7999, 13999], ["Curtain Pair", 1499, 3499],
    ["Velvet Prayer Mat", 899, 1999], ["LED Bulbs (Pack of 4)", 999, 1799],
    ["Wall Clock", 1299, 2799], ["Door Floor Mat", 799, 1599],
    ["Storage Boxes (Set of 3)", 1299, 2499], ["Cushion Covers (Set of 5)", 999, 1999],
    ["Table Lamp", 1499, 3299], ["Area Rug 5x7 ft", 4999, 9999],
    ["Kitchen Organizer Rack", 1799, 3499], ["Glass Water Set (6pc)", 1299, 2499],
    ["Spin Mop Set", 1299, 2499], ["Laundry Basket", 999, 1999],
    ["Shoe Rack", 2499, 4999], ["Iron Stand", 1499, 2999],
    ["Double-Ply Blanket", 2999, 5999], ["Pillow Set (2pc)", 999, 1999],
    ["Folding Chair", 1999, 3999], ["Air Freshener Pack", 499, 999],
  ],
  "beauty-care": [
    ["Gentle Face Wash 150ml", 549, 1099], ["Herbal Shampoo 400ml", 649, 1299],
    ["Conditioner 400ml", 699, 1399], ["Matte Lipstick Set (6pc)", 999, 1999],
    ["Eau de Parfum 100ml", 1999, 4499], ["Coconut Hair Oil 200ml", 449, 899],
    ["Whitening Face Cream", 799, 1599], ["Sunscreen SPF 50", 899, 1799],
    ["Waterproof Kajal", 349, 699], ["Liquid Foundation", 999, 1999],
    ["Body Lotion 400ml", 749, 1499], ["Antibacterial Hand Wash", 349, 649],
    ["Bath Soap (Pack of 4)", 399, 799], ["Charcoal Face Mask", 599, 1199],
    ["Hair Serum 100ml", 899, 1799], ["Nail Polish Set (12pc)", 799, 1499],
    ["Makeup Brushes Set", 1299, 2599], ["Rose Water 200ml", 399, 799],
    ["Beard Oil 50ml", 699, 1399], ["Petroleum Jelly", 299, 549],
    ["Talcum Powder", 349, 649], ["Hair Color", 549, 1099],
  ],
  "sports-fitness": [
    ["English Willow Cricket Bat", 4999, 12999], ["Cricket Tennis Balls (6pc)", 599, 1199],
    ["Football Size 5", 1499, 2999], ["Dumbbell Set 20kg", 5999, 11999],
    ["Non-Slip Yoga Mat", 1299, 2799], ["Badminton Racket Pair", 1999, 3999],
    ["Skipping Rope", 499, 999], ["Gym Gloves", 799, 1599],
    ["Sports Water Bottle 1L", 599, 1299], ["Boxing Gloves", 2499, 4999],
    ["Lawn Tennis Racket", 2999, 5999], ["Carrom Board", 1999, 3999],
    ["Resistance Bands Set", 999, 1999], ["Knee Support", 699, 1399],
    ["Cricket Kit Bag", 2499, 4999], ["Table Tennis Set", 1799, 3499],
    ["Adjustable Dumbbell", 3499, 6999], ["Push-up Bars", 999, 1999],
    ["Sports Duffel Bag", 1499, 2999], ["Chess Board", 899, 1799],
    ["Hockey Stick", 1999, 3999], ["Swimming Goggles", 899, 1799],
  ],
  "kids-baby": [
    ["School Backpack", 1299, 2799], ["Remote Control Toy Car", 1999, 3999],
    ["Doll House Set", 2499, 4999], ["Baby Diapers (Pack of 44)", 1499, 2499],
    ["Baby Lotion 200ml", 549, 1099], ["Kids Bicycle 16\"", 8999, 14999],
    ["Building Blocks 100pc", 1499, 2999], ["Water Color Set", 499, 999],
    ["Lunch Box with Bottle", 799, 1599], ["Baby Walker", 3499, 6999],
    ["Soft Teddy Bear", 899, 1799], ["Kids Sports Shoes", 1499, 2999],
    ["Geometry Box", 349, 699], ["Story Books (Set of 5)", 999, 1999],
    ["Baby Shampoo 200ml", 499, 999], ["Kids Tricycle", 5999, 9999],
    ["Play Dough Set", 699, 1399], ["Baby Blanket", 999, 1999],
    ["Kids Digital Watch", 899, 1799], ["Drawing Art Kit", 799, 1599],
    ["Baby Feeder Set", 899, 1799], ["Kids Tent House", 1999, 3999],
  ],
  "grocery-essentials": [
    ["Basmati Rice 5kg", 1899, 2499], ["Cooking Oil 5 Litre", 2499, 2999],
    ["Tea 950g", 1499, 1899], ["Sugar 5kg", 749, 899],
    ["Wheat Flour 10kg", 1299, 1599], ["Pure Honey 500g", 899, 1499],
    ["Dates (Khajoor) 1kg", 799, 1499], ["Iodized Salt 800g", 120, 220],
    ["Spice Box (Masala Dabba)", 1499, 2499], ["Detergent Powder 1kg", 549, 799],
    ["Dishwashing Bar", 299, 499], ["Tissue Paper (Pack of 5)", 549, 899],
    ["Red Lentils (Daal) 2kg", 699, 999], ["Chickpeas (Chana) 2kg", 599, 899],
    ["Pasta 900g", 449, 699], ["Mixed Fruit Jam 450g", 399, 649],
    ["Desi Ghee 2.5kg", 1899, 2499], ["Green Tea 200g", 699, 1199],
    ["Roasted Peanuts 500g", 449, 749], ["Vermicelli (Sawaiyan) 1kg", 349, 549],
    ["Mango Pickle 1kg", 549, 899], ["Floor Cleaner 1L", 449, 699],
    ["Black Pepper 200g", 899, 1399],
  ],
};

const DESCRIPTIONS: Record<string, string[]> = {
  fashion: [
    "{n} made from premium quality fabric with a comfortable, durable fit. Ideal for daily wear and special occasions. Color-fast and easy to wash.",
    "Stylish {n} crafted for comfort and long life. Fine stitching and a modern cut make it a wardrobe essential. Available in multiple sizes.",
  ],
  electronics: [
    "{n} with reliable performance and energy-efficient design. Comes with official warranty and easy installation. A smart upgrade for your home.",
    "High-quality {n} built for Pakistani homes — voltage-friendly and durable. Includes user manual and warranty card in the box.",
  ],
  "home-living": [
    "{n} that adds comfort and style to your living space. Made from durable materials, easy to clean and maintain. A great value for every home.",
    "Practical and elegant {n} designed for everyday use. Sturdy build quality ensures it lasts for years. Matches most home interiors.",
  ],
  "beauty-care": [
    "{n} with gentle, skin-friendly ingredients. Dermatologically tested formula suitable for daily use. See visible results with regular use.",
    "Premium {n} for your daily care routine. Safe ingredients, pleasant fragrance and effective results. Suitable for all skin types.",
  ],
  "sports-fitness": [
    "{n} built for performance and durability. Perfect for beginners and professionals alike. Train harder with reliable, quality gear.",
    "Professional-grade {n} designed for long training sessions. Ergonomic design reduces strain and improves your game.",
  ],
  "kids-baby": [
    "Safe and fun {n} for your little ones. Made from child-safe, non-toxic materials. Encourages learning through play.",
    "Colorful, durable {n} that kids love. Easy to use and clean. A perfect gift for birthdays and special occasions.",
  ],
  "grocery-essentials": [
    "Fresh, hygienically packed {n} sourced from trusted suppliers. Sealed for freshness with a long shelf life. A staple for every Pakistani kitchen.",
    "Premium quality {n} at an honest price. Carefully packed to preserve taste and nutrition. Your daily essential, delivered to your door.",
  ],
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

async function main() {
  console.log("Seeding Velmora...");

  // Wipe (dev convenience)
  await wipe();

  // Users
  await User.create({
    name: "Store Admin", email: "admin@velmora.pk", phone: "03001234567",
    passwordHash: hashPassword("Admin123!"), role: "ADMIN", loyaltyPoints: 0,
    referralCode: "ADMIN-REF",
  });
  await User.create({
    name: "Demo Customer", email: "customer@velmora.pk", phone: "03007654321",
    passwordHash: hashPassword("Customer123!"), role: "CUSTOMER", loyaltyPoints: 350,
    referralCode: "DEMO-REF",
  });

  // Categories + brands
  const catMap: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const created = await Category.create({
      name: c.name, slug: c.slug, description: c.description,
      image: `/images/products/cat-${c.slug}.jpg`,
    });
    catMap[c.slug] = String(created._id);
  }
  const brandMap: Record<string, string[]> = {};
  for (const [slug, names] of Object.entries(BRANDS)) {
    brandMap[slug] = [];
    for (const n of names) {
      const b = await Brand.create({ name: n, slug: slugify(n) });
      brandMap[slug].push(String(b._id));
    }
  }

  // Products (157 total) — real bundled photos at /images/products/product-<idx>-1.jpg
  let idx = 0;
  const productIds: string[] = [];
  for (const [slug, items] of Object.entries(PRODUCTS)) {
    const templates = DESCRIPTIONS[slug];
    for (const [name, minP, maxP] of items) {
      idx++;
      const price = round50(minP + rand() * (maxP - minP));
      const onSale = rand() < 0.4;
      const compareAt = onSale ? round50(price * (1.15 + rand() * 0.35)) : null;
      const rating = Math.round((3.6 + rand() * 1.4) * 10) / 10;
      const reviewCount = int(4, 420);
      const sold = int(10, 2100);
      const photo = `/images/products/product-${idx}-1.jpg`;
      const p = await Product.create({
        name,
        slug: slugify(name) + "-" + idx,
        description: pick(templates).replace("{n}", name),
        price,
        compareAt,
        cost: round50(price * 0.62),
        sku: `VLM-${slug.slice(0, 3).toUpperCase()}-${String(idx).padStart(4, "0")}`,
        stock: int(5, 300),
        categoryId: catMap[slug],
        brandId: pick(brandMap[slug]),
        images: [photo],
        rating: Math.min(5, rating),
        reviewCount,
        sold,
        featured: idx % 8 === 0,
        isActive: true,
        isDigital: false,
        allowPreorder: idx % 11 === 0,
        tags: [slug, pick(["new", "bestseller", "trending", "value-pack"])],
      });
      productIds.push(String(p._id));
      // A few variants for fashion/electronics
      if ((slug === "fashion" || slug === "electronics") && idx % 3 === 0) {
        await ProductVariant.create({
          productId: p._id,
          name: slug === "fashion" ? "Size" : "Option",
          options: slug === "fashion" ? ["S", "M", "L", "XL"] : ["Standard", "Pro"],
          priceDelta: 0,
        });
      }
    }
  }
  console.log(`Created ${idx} products`);

  // Coupons
  const now = new Date();
  const yearEnd = new Date(now.getFullYear() + 1, 11, 31);
  await Coupon.insertMany([
    { code: "WELCOME10", kind: "PERCENT", value: 10, minSubtotal: 2000, maxUses: 10000, endsAt: yearEnd, isActive: true },
    { code: "SAVE500", kind: "FLAT", value: 500, minSubtotal: 5000, maxUses: 5000, endsAt: yearEnd, isActive: true },
    { code: "FREESHIP", kind: "FREESHIP", value: 0, minSubtotal: 1500, maxUses: 10000, endsAt: yearEnd, isActive: true },
    { code: "EID20", kind: "PERCENT", value: 20, minSubtotal: 3000, maxUses: 3000, endsAt: yearEnd, isActive: true },
  ]);

  // Banners (real bundled photos)
  await Banner.insertMany([
    { title: "Mega Sale is Live", subtitle: "Up to 50% off fashion, electronics and home essentials.", image: "/images/products/cat-fashion.jpg", link: "/shop", sortOrder: 1, isActive: true },
    { title: "Flash Deals Every Day", subtitle: "New deals drop daily at midnight. Grab them before they end.", image: "/images/products/cat-electronics.jpg", link: "/deals", sortOrder: 2, isActive: true },
    { title: "New Grocery Arrivals", subtitle: "Fresh daily essentials delivered to your doorstep.", image: "/images/products/cat-grocery-essentials.jpg", link: "/shop?category=grocery-essentials", sortOrder: 3, isActive: true },
  ]);

  // FAQs
  await Faq.insertMany([
    { question: "How do I track my order?", answer: "Go to Track Order and enter your order number plus phone number. Registered customers can also see live timelines in My Orders.", sortOrder: 1, isActive: true },
    { question: "What payment methods do you accept?", answer: "Cash on Delivery, debit/credit cards, JazzCash, EasyPaisa and bank transfer.", sortOrder: 2, isActive: true },
    { question: "Do I need an account to shop?", answer: "No. You can check out as a guest. Creating an account is optional and unlocks loyalty points, wallet and order history.", sortOrder: 3, isActive: true },
    { question: "What is your return policy?", answer: "Unused items can be returned within 7 days of delivery. Raise a return request from your order page.", sortOrder: 4, isActive: true },
    { question: "How long does delivery take?", answer: "Standard delivery takes 3-5 working days nationwide. Express delivery takes 1-2 working days in major cities.", sortOrder: 5, isActive: true },
    { question: "How do loyalty points work?", answer: "Earn 1 point for every Rs 100 you spend. Points convert to discounts at checkout and unlock Silver, Gold and Platinum tiers.", sortOrder: 6, isActive: true },
  ]);

  // Blog
  await BlogPost.insertMany([
    { title: "10 Smart Ways to Save While Shopping Online", slug: "10-smart-ways-to-save", excerpt: "Coupons, flash deals and loyalty points — stack them right.", body: "Smart shoppers combine flash deals with coupon codes and loyalty redemption...\n\n1. Always check the Flash Deals page first.\n2. Apply WELCOME10 on your first order.\n3. Pay with wallet balance to earn extra points.", isPublished: true },
    { title: "How to Spot Quality Lawn Before You Buy", slug: "spot-quality-lawn", excerpt: "Thread count, weave and finish — a quick guide.", body: "Good lawn feels soft but holds its shape...", isPublished: true },
    { title: "Setting Up Your First Smart Home", slug: "first-smart-home", excerpt: "Start small with lighting and security.", body: "You do not need to automate everything at once...", isPublished: true },
  ]);

  // Flash deals (4 products, ending in 2 days)
  const dealIds = [productIds[5], productIds[30], productIds[60], productIds[100]].filter(Boolean);
  for (const pid of dealIds) {
    const prod = await Product.findById(pid);
    if (!prod) continue;
    await FlashDeal.create({ productId: prod._id, dealPrice: round50(prod.price * 0.7), startsAt: now, endsAt: new Date(Date.now() + 2 * 86400000), isActive: true });
  }

  // Gift card demo
  await GiftCard.create({ code: "GIFT-1000", balance: 1000, initialBalance: 1000, isActive: true });

  // Warehouses
  const wh1 = await Warehouse.create({ name: "Karachi Main", location: "Karachi, Pakistan" });
  const wh2 = await Warehouse.create({ name: "Lahore North", location: "Lahore, Pakistan" });

  // Auctions (2 demo, ending in 3 days)
  const aucProd = await Product.findById(productIds[13]);
  if (aucProd) {
    await Auction.create({ productId: aucProd._id, startPrice: round50(aucProd.price * 0.5), currentBid: round50(aucProd.price * 0.5), startsAt: now, endsAt: new Date(Date.now() + 3 * 86400000), status: "LIVE" });
  }

  // Digital demo product (e-book)
  const digi = await Product.create({
    name: "Velmora Shopping Guide (E-Book)", slug: "velmora-shopping-guide-ebook-999",
    description: "Demo digital product. Instant download after purchase.",
    price: 499, sku: "VLM-DIG-0001", stock: 9999,
    categoryId: catMap["electronics"], images: ["/images/products/product-14-1.jpg"],
    rating: 4.8, reviewCount: 12, sold: 30, featured: false, isActive: true, isDigital: true, tags: ["digital"],
  });
  await DigitalFile.create({ productId: digi._id, fileName: "velmora-guide.txt", fileUrl: "/downloads/velmora-guide.txt", downloadLimit: 5 });

  // Integrations (empty keys — paste real ones in Admin > Integrations)
  for (const provider of ["stripe", "paypal", "sms", "email", "tcs", "leopards", "google", "facebook"]) {
    await Integration.create({ provider, apiKey: "", apiSecret: "", isActive: false });
  }

  // Settings
  const settings: [string, string][] = [
    ["storeName", "Velmora"],
    ["currency", "PKR"],
    ["currencyRates", JSON.stringify({ PKR: 1, USD: 278, EUR: 300, AED: 75.7 })],
    ["shippingFee", "299"],
    ["freeShipThreshold", "5000"],
    ["expressFee", "250"],
    ["taxRate", "0"],
    ["giftWrapFee", "150"],
    ["loyaltyPer100", "1"],
    ["referralPoints", "200"],
    ["deliverySlots", JSON.stringify(["9am - 12pm", "12pm - 3pm", "3pm - 6pm", "6pm - 9pm"])],
    ["supportEmail", "support@velmora.pk"],
    ["supportPhone", "0300-1234567"],
    ["announcement", "Free delivery on orders over Rs 5,000"],
  ];
  for (const [key, value] of settings) {
    await Setting.create({ key, value });
  }

  console.log("Seed complete. Admin: admin@velmora.pk / Admin123! | Demo: customer@velmora.pk / Customer123!");
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  await main();
  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

