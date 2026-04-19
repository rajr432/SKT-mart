import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding...");

  await prisma.user.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.banner.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.pincode.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.taxRate.deleteMany({});
  await prisma.messageTemplate.deleteMany({});
  await prisma.appSettings.deleteMany({});

  // Global app settings
  await prisma.appSettings.create({ data: { id: "default" } });

  const adminPass = await bcrypt.hash("sktmart10010@A", 10);
  const vendorPass = await bcrypt.hash("vendor@123", 10);
  const customerPass = await bcrypt.hash("customer@123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "SKT Admin",
      email: "sktmart25@gmail.com",
      password: adminPass,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  const vendorUser = await prisma.user.create({
    data: {
      name: "Raj Vendor",
      email: "vendor@sktmart.com",
      password: vendorPass,
      role: "VENDOR",
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: "Aman Customer",
      email: "customer@sktmart.com",
      password: customerPass,
      role: "CUSTOMER",
      emailVerified: true,
    },
  });

  const vendor = await prisma.vendor.create({
    data: {
      userId: vendorUser.id,
      storeName: "Raj Electronics Store",
      slug: "raj-electronics",
      description: "Trusted seller of genuine electronics since 2015.",
      status: "APPROVED",
      rating: 4.5,
      gstin: "22AAAAA0000A1Z5",
    },
  });

  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Electronics", slug: "electronics", description: "Gadgets, mobiles, laptops" } }),
    prisma.category.create({ data: { name: "Fashion", slug: "fashion", description: "Men, women, kids clothing" } }),
    prisma.category.create({ data: { name: "Home & Kitchen", slug: "home-kitchen", description: "Appliances, cookware, decor" } }),
    prisma.category.create({ data: { name: "Books", slug: "books", description: "Fiction, textbooks, comics" } }),
    prisma.category.create({ data: { name: "Beauty", slug: "beauty", description: "Skincare, makeup, wellness" } }),
    prisma.category.create({ data: { name: "Sports", slug: "sports", description: "Fitness, outdoor, gear" } }),
  ]);

  const [electronics, fashion, home, books] = categories;

  await prisma.category.createMany({
    data: [
      { name: "Mobiles", slug: "mobiles", parentId: electronics.id },
      { name: "Laptops", slug: "laptops", parentId: electronics.id },
      { name: "Audio", slug: "audio", parentId: electronics.id },
      { name: "Men", slug: "men-fashion", parentId: fashion.id },
      { name: "Women", slug: "women-fashion", parentId: fashion.id },
      { name: "Kitchen", slug: "kitchen", parentId: home.id },
    ],
  });

  const img = (seed: string) =>
    `https://picsum.photos/seed/${seed}/600/600`;

  const products = [
    {
      name: "Redmi Note 13 Pro 5G",
      slug: "redmi-note-13-pro-5g",
      description: "6.67\" AMOLED 120Hz, Snapdragon 7s Gen 2, 200MP camera, 5100mAh battery.",
      brand: "Xiaomi",
      sku: "RDMNT13P-5G-256",
      mrp: 2999900,
      price: 2399900,
      stock: 50,
      fAssured: true,
      categoryId: electronics.id,
      specs: { ram: "8GB", storage: "256GB", display: "6.67 inch AMOLED" },
      images: [img("redmi1"), img("redmi2"), img("redmi3")],
    },
    {
      name: "Dell Inspiron 15 i5-1235U",
      slug: "dell-inspiron-15-i5",
      description: "15.6\" FHD, 12th Gen Intel Core i5, 16GB RAM, 512GB SSD, Windows 11.",
      brand: "Dell",
      sku: "DELL-INSP-15-I5",
      mrp: 7499900,
      price: 5499900,
      stock: 20,
      fAssured: true,
      categoryId: electronics.id,
      specs: { cpu: "Intel i5-1235U", ram: "16GB", ssd: "512GB" },
      images: [img("dell1"), img("dell2")],
    },
    {
      name: "boAt Airdopes 141",
      slug: "boat-airdopes-141",
      description: "TWS earbuds with 42H playtime, ENx tech, low-latency BEAST mode.",
      brand: "boAt",
      sku: "BOAT-AD-141",
      mrp: 299900,
      price: 129900,
      stock: 500,
      fAssured: true,
      categoryId: electronics.id,
      images: [img("boat1"), img("boat2")],
    },
    {
      name: "Men's Cotton Crew-neck T-shirt",
      slug: "mens-cotton-tshirt-navy",
      description: "100% combed cotton, regular fit, round neck half sleeve t-shirt.",
      brand: "Allen Solly",
      sku: "AS-TSHIRT-M-NAVY",
      mrp: 99900,
      price: 49900,
      stock: 200,
      categoryId: fashion.id,
      images: [img("tshirt1"), img("tshirt2")],
    },
    {
      name: "Women's Anarkali Kurta Set",
      slug: "womens-anarkali-kurta-set",
      description: "Rayon anarkali kurta with dupatta and palazzo. Floor length.",
      brand: "Biba",
      sku: "BIBA-ANARKALI-M",
      mrp: 299900,
      price: 149900,
      stock: 80,
      categoryId: fashion.id,
      images: [img("kurta1")],
    },
    {
      name: "Prestige Iris Mixer Grinder 750W",
      slug: "prestige-iris-mixer-750w",
      description: "750W copper-wound motor, 3 stainless steel jars, 2 yr warranty.",
      brand: "Prestige",
      sku: "PRES-IRIS-750",
      mrp: 499900,
      price: 299900,
      stock: 40,
      fAssured: true,
      categoryId: home.id,
      images: [img("mixer1"), img("mixer2")],
    },
    {
      name: "Atomic Habits — James Clear",
      slug: "atomic-habits-james-clear",
      description: "An easy & proven way to build good habits and break bad ones.",
      brand: "Random House",
      sku: "BOOK-AH-JC",
      mrp: 59900,
      price: 34900,
      stock: 300,
      categoryId: books.id,
      images: [img("book1")],
    },
    {
      name: "Stainless Steel Pressure Cooker 5L",
      slug: "ss-pressure-cooker-5l",
      description: "Induction-compatible stainless steel pressure cooker 5 litre.",
      brand: "Hawkins",
      sku: "HAWK-SS-5L",
      mrp: 249900,
      price: 189900,
      stock: 60,
      categoryId: home.id,
      images: [img("cooker1")],
    },
  ];

  for (const p of products) {
    const { images, ...rest } = p;
    await prisma.product.create({
      data: {
        ...rest,
        vendorId: vendor.id,
        images: { create: images.map((url, i) => ({ url, position: i })) },
      },
    });
  }

  await prisma.banner.createMany({
    data: [
      {
        title: "Mega Electronics Sale",
        image: img("banner1"),
        link: "/category/electronics",
        position: 1,
      },
      {
        title: "Fashion Under ₹499",
        image: img("banner2"),
        link: "/category/fashion",
        position: 2,
      },
      {
        title: "Home Essentials",
        image: img("banner3"),
        link: "/category/home-kitchen",
        position: 3,
      },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        title: "10% off your first order",
        type: "PERCENT",
        value: 10,
        minOrder: 49900,
        maxDiscount: 50000,
      },
      {
        code: "FLAT100",
        title: "Flat ₹100 off on orders above ₹999",
        type: "FLAT",
        value: 10000,
        minOrder: 99900,
      },
    ],
  });

  await prisma.pincode.createMany({
    data: [
      { pincode: "110001", city: "New Delhi", state: "Delhi", etaDays: 2 },
      { pincode: "400001", city: "Mumbai", state: "Maharashtra", etaDays: 3 },
      { pincode: "560001", city: "Bengaluru", state: "Karnataka", etaDays: 3 },
      { pincode: "700001", city: "Kolkata", state: "West Bengal", etaDays: 4 },
      { pincode: "600001", city: "Chennai", state: "Tamil Nadu", etaDays: 4 },
      { pincode: "500001", city: "Hyderabad", state: "Telangana", etaDays: 3 },
      { pincode: "411001", city: "Pune", state: "Maharashtra", etaDays: 3 },
      { pincode: "800001", city: "Patna", state: "Bihar", etaDays: 5 },
      { pincode: "834001", city: "Ranchi", state: "Jharkhand", etaDays: 5 },
      { pincode: "302001", city: "Jaipur", state: "Rajasthan", etaDays: 4 },
    ],
  });

  await prisma.address.create({
    data: {
      userId: customerUser.id,
      name: "Aman Customer",
      phone: "9000000000",
      line1: "Flat 201, Green Avenue",
      line2: "Near City Mall",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      isDefault: true,
    },
  });

  // Seed some brands
  await prisma.brand.createMany({
    data: [
      { name: "Xiaomi", slug: "xiaomi" },
      { name: "Dell", slug: "dell" },
      { name: "boAt", slug: "boat" },
      { name: "Allen Solly", slug: "allen-solly" },
      { name: "Biba", slug: "biba" },
      { name: "Prestige", slug: "prestige" },
      { name: "Hawkins", slug: "hawkins" },
    ],
  });

  // Tax rates
  await prisma.taxRate.createMany({
    data: [
      { hsnCode: "8517", description: "Mobile phones", cgst: 9, sgst: 9, igst: 18 },
      { hsnCode: "6109", description: "T-Shirts", cgst: 6, sgst: 6, igst: 12 },
      { hsnCode: "8516", description: "Kitchen appliances", cgst: 9, sgst: 9, igst: 18 },
      { hsnCode: "4901", description: "Books", cgst: 0, sgst: 0, igst: 0 },
    ],
  });

  // Pre-credit vendor wallet so they can run ads
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: { walletBalance: 500000 },
  });
  await prisma.walletTransaction.create({
    data: {
      vendorId: vendor.id,
      type: "CREDIT",
      reason: "RECHARGE",
      amountPaise: 500000,
      balanceAfter: 500000,
      note: "Initial seed recharge",
    },
  });

  // Sample ad campaign on first product
  const firstProduct = await prisma.product.findFirst({ where: { vendorId: vendor.id } });
  if (firstProduct) {
    await prisma.adCampaign.create({
      data: {
        vendorId: vendor.id,
        productId: firstProduct.id,
        name: "Boost - Redmi Note 13",
        budgetPaise: 200000,
        bidPaise: 500,
        status: "ACTIVE",
      },
    });
  }

  // Notification templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        key: "ORDER_PLACED",
        channel: "EMAIL",
        subject: "Order Confirmed - SKT Mart",
        body: "Hi {{name}}, your order {{orderNumber}} has been placed.",
      },
      {
        key: "ORDER_SHIPPED",
        channel: "EMAIL",
        subject: "Order Shipped - SKT Mart",
        body: "Hi {{name}}, your order {{orderNumber}} has been shipped. Track at {{trackingLink}}.",
      },
      {
        key: "RETURN_APPROVED",
        channel: "EMAIL",
        subject: "Return Approved",
        body: "Hi {{name}}, your return {{rmaNumber}} has been approved.",
      },
    ],
  });

  // Customer referral code
  await prisma.user.update({
    where: { id: customerUser.id },
    data: { referralCode: "SKTWELCOME" },
  });

  console.log("✓ Seed complete");
  console.log(`  admin:    sktmart25@gmail.com / sktmart10010@A (${admin.id})`);
  console.log(`  vendor:   vendor@sktmart.com  / vendor@123     (${vendorUser.id})`);
  console.log(`  customer: customer@sktmart.com / customer@123  (${customerUser.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
