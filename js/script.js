// ===== CONFIG =====
const SHEET_CSV_URL =
   "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1-DANp6M_vHov7HiZ1n2fy7tdVdOKf2GD6EbpBC5h7Wdd4rNNp1sGhZyos7CAyam-GQVXvgc0sgwF/pub?output=csv";
const WA_NUMBER = "201028254215"; // غيّر ده برقم الواتساب الحقيقي

// Sheet names (order matters for tabs)
const SHEET_NAMES = [
   { gid: "278057941", label: "الوجبات" },
   { gid: "906908840", label: "الوجبات الخاصة" },
   { gid: "1381390065", label: "أطباق إضافية" },
   { gid: "1186541827", label: "السندوتشات" },
   { gid: "191852881", label: "المشويات" },
   { gid: "309968752", label: "الطواجن" },
   { gid: "874969173", label: "الصواني العائلية" },
   { gid: "9954018", label: "المشروبات والحلويات" },
];

// ===== PARSE CSV =====
function parseCSV(text) {
   const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
   if (lines.length < 2) return [];
   return lines
      .slice(1)
      .map((line) => {
         const cols = line
            .split(",")
            .map((c) => c.replace(/^"|"$/g, "").trim());
         return {
            name: cols[0] || "",
            price: cols[1] || "",
            priceHalf: cols[2] || "",
            priceKilo: cols[3] || ""
         };
      })
      .filter((r) => r.name);
}

// ===== FETCH ONE SHEET =====
async function fetchSheet(gid) {
   const url = SHEET_CSV_URL.replace("output=csv", `output=csv&gid=${gid}`);
   const res = await fetch(url);
   if (!res.ok) throw new Error("fetch failed");
   const text = await res.text();
   return parseCSV(text);
}

// ===== CART STATE & LOGIC =====
let allSheets = [];
let cart = {};

function updateCartUI() {
   let totalItems = 0;
   let totalPrice = 0;

   for (let key in cart) {
      totalItems += cart[key].qty;
      totalPrice += cart[key].price * cart[key].qty;
   }

   const cartIcon = document.getElementById("cart-icon");
   const badge = document.getElementById("cart-badge");
   const modalTotal = document.getElementById("modal-total-price");

   if (totalItems > 0) {
      cartIcon.style.display = "flex";
      badge.textContent = totalItems;
   } else {
      cartIcon.style.display = "none";
   }

   if (modalTotal) {
      modalTotal.textContent = totalPrice;
   }

   // trigger re-rendering of the modal items if it's open
   renderModalItems();

   // trigger re-rendering of all item cards currently on screen
   document.querySelectorAll(".item-actions").forEach((container) => {
      const itemName = container.dataset.itemName;
      const itemPrice = container.dataset.itemPrice;
      if (itemName && itemPrice) {
         renderActionsForContainer(container, {
            name: itemName,
            price: Number(itemPrice),
         });
      }
   });
}

function addToCart(item) {
   if (!cart[item.name]) {
      cart[item.name] = { price: Number(item.price), qty: 1 };
   } else {
      cart[item.name].qty += 1;
   }
   updateCartUI();
}

function removeFromCart(item) {
   if (cart[item.name]) {
      cart[item.name].qty -= 1;
      if (cart[item.name].qty === 0) {
         delete cart[item.name];
      }
   }
   updateCartUI();
}

function openCart() {
   document.getElementById("cart-modal").style.display = "flex";
   renderModalItems();
}

function closeCart() {
   document.getElementById("cart-modal").style.display = "none";
}

function renderModalItems() {
   const container = document.getElementById("cart-items-container");
   if (!container) return;

   container.innerHTML = "";
   let hasItems = false;

   for (let name in cart) {
      hasItems = true;
      const item = cart[name];
      const div = document.createElement("div");
      div.className = "cart-modal-item";

      div.innerHTML = `
         <div class="c-item-info">
            <div class="c-item-name">${name}</div>
            <div class="c-item-price">${item.price * item.qty} جنيه</div>
         </div>
         <div class="qty-controls">
            <button class="qty-btn minus-btn" onclick="removeFromCart({name: '${name}', price: ${item.price}})">&minus;</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn plus-btn" onclick="addToCart({name: '${name}', price: ${item.price}})">+</button>
         </div>
      `;
      container.appendChild(div);
   }

   if (!hasItems) {
      container.innerHTML = `<div style="text-align:center; color:var(--muted); padding: 20px;">السلة فارغة</div>`;
   }
}

function sendOrder() {
   if (Object.keys(cart).length === 0) return;

   let lines = ["أهلا، عايز أطلب الآتي:", ""];
   let totalPrice = 0;

   for (let name in cart) {
      let item = cart[name];
      let itemTotal = item.price * item.qty;
      totalPrice += itemTotal;
      lines.push(`- ${name} × ${item.qty} = ${itemTotal} جنيه`);
      lines.push(""); // ← هنا
   }

   lines.push("");
   lines.push(`الإجمالي: ${totalPrice} جنيه`);

   const msg = encodeURIComponent(lines.join("\n"));
   window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
}

function renderActionsForContainer(container, item) {
   container.innerHTML = "";
   const currentQty = cart[item.name] ? cart[item.name].qty : 0;

   if (currentQty === 0) {
      const btn = document.createElement("button");
      btn.className = "add-btn";
      btn.onclick = () => addToCart(item);
      btn.innerHTML = `<svg viewBox="0 0 24 24" class="add-icon"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> طلب `;
      container.appendChild(btn);
   } else {
      const controls = document.createElement("div");
      controls.className = "qty-controls";

      const minus = document.createElement("button");
      minus.className = "qty-btn minus-btn";
      minus.onclick = () => removeFromCart(item);
      minus.innerHTML = `&minus;`;

      const qtyShow = document.createElement("span");
      qtyShow.className = "qty-num";
      qtyShow.textContent = currentQty;

      const plus = document.createElement("button");
      plus.className = "qty-btn plus-btn";
      plus.onclick = () => addToCart(item);
      plus.innerHTML = `+`;

      controls.appendChild(minus);
      controls.appendChild(qtyShow);
      controls.appendChild(plus);
      container.appendChild(controls);
   }
}

// ===== BUILD DOM =====
function buildCard(item) {
   const card = document.createElement("div");
   card.className = "item-card";

   const name = document.createElement("div");
   name.className = "item-name";
   name.textContent = item.name;

   if (item.priceHalf && item.priceKilo) {
      const variants = [
         { label: "1/4 كيلو", price: item.price, name: `${item.name} (1/4 كيلو)` },
         { label: "1/2 كيلو", price: item.priceHalf, name: `${item.name} (1/2 كيلو)` },
         { label: "1 كيلو", price: item.priceKilo, name: `${item.name} (1 كيلو)` }
      ];

      const select = document.createElement("select");
      select.className = "variant-select";
      variants.forEach((v, index) => {
         const option = document.createElement("option");
         option.value = index;
         option.textContent = `${v.price} ج — ${v.label}`;
         select.appendChild(option);
      });

      const right = document.createElement("div");
      right.className = "item-right";

      const actions = document.createElement("div");
      actions.className = "item-actions";
      
      let selectedVariant = variants[0];
      actions.dataset.itemName = selectedVariant.name;
      actions.dataset.itemPrice = selectedVariant.price;

      select.addEventListener("change", (e) => {
         selectedVariant = variants[e.target.value];
         actions.dataset.itemName = selectedVariant.name;
         actions.dataset.itemPrice = selectedVariant.price;
         renderActionsForContainer(actions, selectedVariant);
      });

      renderActionsForContainer(actions, selectedVariant);
      
      right.appendChild(select);
      right.appendChild(actions);

      card.appendChild(name);
      card.appendChild(right);
      return card;
   }

   const right = document.createElement("div");
   right.className = "item-right";

   const price = document.createElement("div");
   price.className = "item-price";
   price.innerHTML = `<span>جنيه</span>${item.price}`;

   const actions = document.createElement("div");
   actions.className = "item-actions";
   actions.dataset.itemName = item.name;
   actions.dataset.itemPrice = item.price;
   
   renderActionsForContainer(actions, item);

   right.appendChild(price);
   right.appendChild(actions);
   card.appendChild(name);
   card.appendChild(right);

   return card;
}

function showCategory(index) {
   const main = document.getElementById("menu-content");
   const sheet = allSheets[index];

   if (!sheet) return;

   document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.index) === index);
   });

   main.innerHTML = "";

   const sec = document.createElement("div");
   sec.className = "category-section";
   sec.id = `section-${index}`;
   sec.style.animationDelay = `0s`;

   const title = document.createElement("div");
   title.className = "category-title";
   title.textContent = sheet.label;

   const count = document.createElement("div");
   count.className = "category-count";
   count.textContent = `${sheet.items.length} صنف`;

   const grid = document.createElement("div");
   grid.className = "items-grid";

   sheet.items.forEach((item) => grid.appendChild(buildCard(item)));

   sec.appendChild(title);
   sec.appendChild(count);
   sec.appendChild(grid);
   main.appendChild(sec);

   window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildMenu(sheets) {
   allSheets = sheets;
   const nav = document.getElementById("tabs-container");

   let firstValidIndex = -1;

   sheets.forEach((sheet, i) => {
      if (!sheet.items || !sheet.items.length) return;

      if (firstValidIndex === -1) {
         firstValidIndex = i;
      }

      // Tab button
      const btn = document.createElement("button");
      btn.className = "tab-btn";
      btn.textContent = sheet.label;
      btn.dataset.index = i;
      btn.addEventListener("click", () => showCategory(i));
      nav.appendChild(btn);
   });

   // Show nav + content
   document.getElementById("tab-nav").style.display = "block";
   document.getElementById("menu-content").style.display = "block";

   if (firstValidIndex !== -1) {
      showCategory(firstValidIndex);
   }
}

// ===== MAIN =====
async function loadMenu() {
   try {
      const results = await Promise.all(
         SHEET_NAMES.map(async (s) => {
            try {
               const items = await fetchSheet(s.gid);
               return { label: s.label, items };
            } catch {
               return { label: s.label, items: [] };
            }
         }),
      );

      document.getElementById("loading").style.display = "none";

      const hasData = results.some((r) => r.items.length > 0);
      if (!hasData) {
         document.getElementById("error-msg").style.display = "block";
         return;
      }

      buildMenu(results);
   } catch (err) {
      document.getElementById("loading").style.display = "none";
      document.getElementById("error-msg").style.display = "block";
   }
}

loadMenu();
