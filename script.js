let checkoutActiveItems = [];
let pendingPurchase = {id:null, qty:1, variant:'Frozen (beku)'};
let addressEditorFromCheckout = false;
function safeReadJSON(key, fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch(error){console.warn('Data lokal tidak valid, memakai nilai awal untuk',key);return fallback}}
let authMode='login', pendingAction=null, productTab='Semua', detailQty=1, detailVariant='Frozen (beku)', detailProductId=null, cart=safeReadJSON('dinsumCart',[]).map(i=>({...i,id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)})), selectedCartIds=new Set(cart.map(i=>Number(i.id))), selectedPayment={name:'BRI',img:'assets/bri.svg'}, selectedShipping={name:'J&T Express',img:'assets/jnt.svg',estimate:'Estimasi 2–4 hari',cost:12000}, selectedVoucher='none', pickupAtStore=false;
const products=[
{id:1,name:'DIMSUM Ayam Original',description:'Dimsum ayam dengan cita rasa gurih klasik, cocok untuk camilan, teman makan, atau sajian bersama keluarga.',tag:'Terlaris',price:89000,old:110000,image:'assets/products/dimsum-ayam-original.svg',sold:'2,3RB'},
{id:2,name:'DIMSUM Udang Premium',description:'Pilihan dimsum dengan perpaduan rasa gurih ayam dan udang yang cocok untuk kamu yang menyukai rasa seafood.',tag:'Terlaris',price:99000,old:125000,image:'assets/products/dimsum-udang-baru.svg',sold:'1,8RB'},
{id:3,name:'DIMSUM Mentai',description:'Dimsum dengan sentuhan saus mentai yang creamy dan gurih, pilihan menarik untuk camilan dengan rasa lebih kaya.',tag:'Promo',price:95000,old:120000,image:'assets/products/dimsum-mentai.svg',sold:'1,1RB'},
{id:4,name:'DIMSUM Nori',description:'Dimsum dengan sentuhan nori yang memberi aroma khas dan rasa gurih, cocok untuk variasi menu dimsum favoritmu.',tag:'Promo',price:92000,old:115000,image:'assets/products/dimsum-nori.svg',sold:'985'},
{id:5,name:'DIMSUM Mozarella',description:'Dimsum dengan perpaduan rasa gurih dan keju mozzarella yang cocok untuk pencinta camilan dengan rasa keju.',tag:'Promo',price:105000,old:130000,image:'assets/products/dimsum-mozarella.svg',sold:'544'},
{id:6,name:'DIMSUM Jumbo',description:'Pilihan dimsum berukuran jumbo untuk sajian yang lebih mantap, cocok dinikmati sendiri atau dibagikan bersama.',tag:'Terlaris',price:110000,old:140000,image:'assets/products/dimsum-jumbo.svg',sold:'1,5RB'},
{id:7,name:'DIMSUM Chili Oil',description:'Dimsum dengan sentuhan chili oil untuk sensasi gurih dan pedas, cocok bagi kamu yang menyukai rasa lebih berani.',tag:'Promo',price:98000,old:125000,image:'assets/products/dimsum-chili-oil.svg',sold:'680'},
{id:8,name:'DIMSUM Mix Box',description:'Kotak pilihan berisi variasi dimsum dalam satu paket, cocok untuk mencoba beberapa pilihan atau disajikan saat berkumpul.',tag:'Baru',price:119000,old:150000,image:'assets/products/dimsum-mix-box.svg',sold:'432'}];
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const $=id=>document.getElementById(id);
function getAccounts(){
  let accounts=JSON.parse(localStorage.getItem('dinsumAccounts')||'[]');
  const old=JSON.parse(localStorage.getItem('dinsumUser')||'null');
  // Migrasi akun lama yang masih memakai email sebagai identitas login.
  if(!accounts.length && old){
    const base=(old.username||old.email||old.name||'dinsum').toString().split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
    old.username=base||'dinsumuser';
    accounts=[old];
    localStorage.setItem('dinsumAccounts',JSON.stringify(accounts));
  }
  // Pastikan akun lama yang belum punya username mendapat username otomatis.
  let changed=false;
  accounts=accounts.map((u,i)=>{
    if(!u.username){
      const base=(u.email||u.name||('dinsum'+(i+1))).toString().split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
      u.username=base||('dinsum'+(i+1)); changed=true;
    }
    return u;
  });
  if(changed) saveAccounts(accounts);
  return accounts;
}
function saveAccounts(accounts){localStorage.setItem('dinsumAccounts',JSON.stringify(accounts))}
function getUser(){
  const username=localStorage.getItem('dinsumCurrentUser');
  const accounts=getAccounts();
  if(username){return accounts.find(u=>(u.username||'').toLowerCase()===username.toLowerCase())||null}
  return JSON.parse(localStorage.getItem('dinsumUser')||'null');
}
function saveUser(u){
  const accounts=getAccounts();
  const idx=accounts.findIndex(x=>x.username===u.username);
  if(idx>=0) accounts[idx]=u; else accounts.push(u);
  saveAccounts(accounts);
  localStorage.setItem('dinsumCurrentUser',u.username);
  localStorage.setItem('dinsumUser',JSON.stringify(u));
  renderUserUI();
}
function renderUserUI(){
  const u=getUser();
  const fallback=(u?.name||'D').trim().charAt(0).toUpperCase()||'👤';
  const avatar=u?.photo
    ? `<img src="${u.photo}" alt="Foto profil" loading="eager">`
    : `<span class="avatar-initial">${fallback}</span>`;
  const top=$('topProfileAvatar'), bottom=$('bottomProfileAvatar');
  if(top){ top.innerHTML=avatar; top.setAttribute('aria-label',u?.name?`Profil ${u.name}`:'Buka akun'); }
  if(bottom){ bottom.innerHTML=avatar; bottom.setAttribute('aria-label',u?.name?`Profil ${u.name}`:'Akun'); }
}
function showStore(){$('authPage').classList.add('hidden');$('authPage').classList.remove('guest-auth');$('storePage').classList.remove('hidden');renderProducts();renderCart();renderUserUI();applySiteLanguage()}
function openAuth(mode='login',action=null){authMode=mode;pendingAction=action;updateAuthUI();$('authMessage').textContent='';$('authForm').reset();$('authPage').classList.remove('hidden');$('authPage').classList.add('guest-auth');updateAuthUI();setTimeout(()=>$('authUsername').focus(),50)}
function closeAuth(){if($('authPage').classList.contains('guest-auth')){$('authPage').classList.add('hidden');$('authPage').classList.remove('guest-auth');pendingAction=null}}
function finishPendingAction(){const action=pendingAction;pendingAction=null;if(action?.type==='add')addToCartAfterLogin(action.id);else if(action?.type==='buy')buyNowAfterLogin(action.id);else if(action?.type==='checkout')openCheckout()}
function updateAuthUI(){let reg=authMode==='register';$('authTitle').textContent=reg?'':'Masuk ke Akun Kamu';$('authSubtitle').textContent=reg?'Buat akun kamu untuk mulai berbelanja.':'Masukkan username dan password untuk melanjutkan pembelian.';$('nameGroup').classList.toggle('hidden',!reg);$('emailGroup').classList.toggle('hidden',!reg);$('confirmGroup').classList.toggle('hidden',!reg);$('authSubmit').textContent=reg?'Daftar':'Masuk';$('switchAuth').innerHTML=reg?'Sudah punya akun? <b>Masuk</b>':'Belum punya akun? <b>Daftar</b>';const email=$('authEmail');if(email) email.required=reg}
$('switchAuth').onclick=()=>{authMode=authMode==='login'?'register':'login';$('authMessage').textContent='';$('authForm').reset();updateAuthUI()};
$('authForm').onsubmit=e=>{
  e.preventDefault();
  const username=$('authUsername').value.trim().toLowerCase(),pass=$('authPassword').value,msg=$('authMessage'),accounts=getAccounts();
  if(authMode==='register'){
    const name=$('authName').value.trim(),email=$('authEmail').value.trim().toLowerCase(),confirm=$('authConfirm').value;
    if(!name)return msg.textContent='Nama wajib diisi.';
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return msg.textContent='Username 3–20 karakter, hanya huruf, angka, dan _.'.replace('–','-');
    if(accounts.some(u=>(u.username||'').toLowerCase()===username))return msg.textContent='Username sudah dipakai. Silakan pilih username lain.';
    if(pass.length<6)return msg.textContent='Password minimal 6 karakter.';
    if(pass!==confirm)return msg.textContent='Konfirmasi password tidak sama.';
    const u={name,username,email,password:pass,address:'Jl. Sepakat No. 12, Pontianak, Kalimantan Barat',phone:'',photo:''};
    accounts.push(u);saveAccounts(accounts);localStorage.setItem('dinsumCurrentUser',username);localStorage.setItem('dinsumUser',JSON.stringify(u));showStore();finishPendingAction();
  }else{
    const u=accounts.find(x=>(x.username||'').toLowerCase()===username);
    if(!u)return msg.textContent='Username belum terdaftar. Silakan daftar terlebih dahulu.';
    if(pass!==u.password)return msg.textContent='Username atau password salah.';
    localStorage.setItem('dinsumCurrentUser',u.username);localStorage.setItem('dinsumUser',JSON.stringify(u));showStore();finishPendingAction();
  }
};
function logout(){localStorage.removeItem('dinsumCurrentUser');localStorage.removeItem('dinsumUser');location.reload()}
function setProductTab(tab,el){productTab=tab;document.querySelectorAll('.filter-row button').forEach(x=>x.classList.remove('active'));if(el)el.classList.add('active');renderProducts();document.getElementById('produk')?.scrollIntoView({behavior:'smooth',block:'start'})}
function syncSearch(){renderProducts($('marketSearch').value.toLowerCase())}
function renderProducts(qOverride){
  const q=(qOverride!==undefined?qOverride:($('marketSearch')?.value||'')).toLowerCase();
  const normalizeText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const query=normalizeText(q).trim();
  const list=products.filter(p=>(productTab==='Semua'||p.tag===productTab)&&(!query||normalizeText([p.name,p.description,p.tag].join(' ')).includes(query)));
  $('productGrid').innerHTML=list.map((p,index)=>`<article class="product product-premium product-card-clickable" role="button" tabindex="0" aria-label="Buka produk ${p.name}" style="--card-index:${index}" onclick="showProductDetail(${p.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showProductDetail(${p.id})}"><div class="product-img"><span class="product-image-badge">${p.tag==='Terlaris'?'TERLARIS':p.tag==='Baru'?'BARU':'PROMO'}</span><img class="product-photo" src="${p.image}" alt="${p.name}" loading="lazy"></div><div class="product-info"><h3>${p.name}</h3><div class="sold"><span class="product-rating">★ 4.9</span><span class="sold-divider">·</span><span>${p.sold} terjual</span></div><div class="product-price-row"><div class="price">${rupiah(p.price)}</div><span class="badge">-15%</span></div><div class="old-price-line"><span class="old">${rupiah(p.old)}</span><span class="product-value-note">Harga spesial</span></div><div class="product-card-hint">Pilih varian &amp; jumlah <span aria-hidden="true">›</span></div></div></article>`).join('')||'<p style="padding:25px">Produk tidak ditemukan.</p>';
}


function save(){
  cart=cart.map(i=>({...i,id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)}));
  localStorage.setItem('dinsumCart',JSON.stringify(cart));
  localStorage.setItem('dinsumSelectedCartIds',JSON.stringify([...selectedCartIds].map(Number)));
  selectedCartIds=new Set([...selectedCartIds].map(Number).filter(id=>cart.some(i=>Number(i.id)===id)));
  renderCart();
}
function getSelectedCartItems(){return cart.filter(i=>selectedCartIds.has(Number(i.id)));}
function toggleCartSelection(id){
  id=Number(id);
  if(selectedCartIds.has(id)) selectedCartIds.delete(id); else selectedCartIds.add(id);
  renderCart();
}
function toggleSelectAll(checked){
  if(checked) cart.forEach(i=>selectedCartIds.add(i.id));
  else selectedCartIds.clear();
  renderCart();
}
function addToCart(id){
  const product=products.find(p=>Number(p.id)===Number(id));
  if(!product){alert('Produk tidak ditemukan. Silakan muat ulang halaman.');return false;}
  const productId=Number(product.id);
  let item=cart.find(i=>Number(i.id)===productId);
  if(item)item.qty=Math.min(99,Math.max(1,Number(item.qty)||1)+1);
  else cart.push({id:productId,qty:1});
  selectedCartIds.add(productId);
  save();
  closeCheckout();
  closeSimple();
  // Buka panel keranjang setelah semua tampilan lain ditutup, lalu render ulang.
  closeCart();
  renderCart();
  openCart();
  // Pastikan panel tetap menjadi tampilan aktif meskipun ada handler lain di halaman.
  const cartPanel=$('cart'), overlay=$('overlay');
  if(cartPanel){cartPanel.classList.add('open');cartPanel.style.right='0';}
  if(overlay)overlay.classList.add('show');
  return true;
}
function addToCartAfterLogin(id){addToCart(id)}
function showProductDetail(id){
  // Klik kartu produk langsung membuka satu-satunya layar pemilihan varian/jumlah.
  // Hindari menampilkan halaman "Detail Produk" kedua sebelum panel opsi pembelian.
  const p=products.find(x=>Number(x.id)===Number(id));
  if(!p)return;
  buyNow(Number(p.id),1,'Frozen (beku)');
}

function selectDetailVariant(button){detailVariant=button.dataset.variant||'Frozen (beku)';document.querySelectorAll('.detail-variant').forEach(b=>b.classList.toggle('selected',b===button))}
function changeDetailQty(delta){detailQty=Math.max(1,Math.min(99,(Number(detailQty)||1)+Number(delta)));const el=$('detailQtyValue');if(el)el.textContent=detailQty}
function addDetailToCart(){const id=Number(detailProductId);if(!id)return;const p=products.find(x=>Number(x.id)===id);if(!p)return;let item=cart.find(i=>Number(i.id)===id);if(item)item.qty=Math.min(99,Math.max(1,Number(item.qty)||1)+Math.max(1,Number(detailQty)||1));else cart.push({id,qty:Math.max(1,Number(detailQty)||1)});selectedCartIds.add(id);save();closeCheckout();closeSimple();closeCart();renderCart();openCart();const panel=$('cart'),overlay=$('overlay');if(panel){panel.classList.add('open');panel.style.right='0'}if(overlay)overlay.classList.add('show');document.querySelector('.topbar')?.classList.remove('home-hidden')}
function buyDetailNow(){if(!detailProductId)return;buyNow(detailProductId,detailQty,detailVariant)}
function buyNow(id, requestedQty=1, requestedVariant='Frozen (beku)'){
  const product=products.find(p=>Number(p.id)===Number(id));
  if(!product){alert('Produk tidak ditemukan. Silakan muat ulang halaman.');return false;}
  pendingPurchase={id:Number(product.id),qty:Math.max(1,Math.min(99,Number(requestedQty)||1)),variant:requestedVariant==='Siap santap'?'Siap santap':'Frozen (beku)'};
  const overlay=$('purchaseOverlay');
  if(!overlay)return false;
  $('purchaseProductImage').src=product.image||'';
  $('purchaseProductImage').alt=product.name;
  $('purchaseProductName').textContent=product.name;
  $('purchaseProductDescription').textContent=product.description||'Dimsum pilihan dari KEL 5.';
  $('purchaseProductPrice').textContent=rupiah(product.price);
  $('purchaseQtyValue').textContent=pendingPurchase.qty;
  document.querySelectorAll('[data-purchase-variant]').forEach(button=>button.classList.toggle('selected',button.dataset.purchaseVariant===pendingPurchase.variant));
  updatePurchaseSubtotal();
  closeSimple();closeCart();closeCheckout();
  overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');document.body.classList.add('purchase-open');
  setTimeout(()=>overlay.querySelector('.purchase-close')?.focus(),30);
  return false;
}
function selectPurchaseVariant(button){
  if(!button)return;
  pendingPurchase.variant=button.dataset.purchaseVariant==='Siap santap'?'Siap santap':'Frozen (beku)';
  document.querySelectorAll('[data-purchase-variant]').forEach(b=>b.classList.toggle('selected',b===button));
}
function changePurchaseQty(delta){
  pendingPurchase.qty=Math.max(1,Math.min(99,(Number(pendingPurchase.qty)||1)+Number(delta||0)));
  const output=$('purchaseQtyValue');if(output)output.textContent=pendingPurchase.qty;
  updatePurchaseSubtotal();
}
function updatePurchaseSubtotal(){
  const product=products.find(p=>Number(p.id)===Number(pendingPurchase.id));if(!product)return;
  const subtotal=product.price*Math.max(1,Number(pendingPurchase.qty)||1);
  if($('purchaseSubtotal'))$('purchaseSubtotal').textContent=rupiah(subtotal);
  if($('purchaseFooterSubtotal'))$('purchaseFooterSubtotal').textContent=rupiah(subtotal);
}
function closePurchaseOptions(){
  const overlay=$('purchaseOverlay');if(!overlay)return;
  overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('purchase-open');
}
function addPurchaseOptionsToCart(){
  const product=products.find(p=>Number(p.id)===Number(pendingPurchase.id));
  if(!product){alert('Produk tidak ditemukan. Silakan muat ulang halaman.');return false;}
  const id=Number(product.id),qty=Math.max(1,Math.min(99,Number(pendingPurchase.qty)||1));
  cart=Array.isArray(cart)?cart:[];
  const existing=cart.find(item=>Number(item.id)===id);
  if(existing)existing.qty=Math.min(99,Math.max(1,Number(existing.qty)||1)+qty);
  else cart.push({id,qty});
  selectedCartIds.add(id);
  try{
    const variants=JSON.parse(localStorage.getItem('dinsumCartVariants')||'{}');
    variants[id]=pendingPurchase.variant;
    localStorage.setItem('dinsumCartVariants',JSON.stringify(variants));
  }catch(e){}
  save();
  closePurchaseOptions();
  renderCart();
  openCart();
  return true;
}

function confirmPurchaseOptions(){
  const product=products.find(p=>Number(p.id)===Number(pendingPurchase.id));if(!product)return;
  const id=Number(product.id),qty=Math.max(1,Math.min(99,Number(pendingPurchase.qty)||1));
  cart=cart.map(item=>({id:Number(item.id),qty:Math.max(1,Number(item.qty)||1)}));
  const existing=cart.find(item=>item.id===id);
  if(existing)existing.qty=qty;else cart.push({id,qty});
  selectedCartIds=new Set([id]);selectedVoucher='none';
  localStorage.setItem('dinsumCheckoutVariant',pendingPurchase.variant);
  localStorage.setItem('dinsumCart',JSON.stringify(cart));
  localStorage.setItem('dinsumSelectedCartIds',JSON.stringify([id]));
  closePurchaseOptions();
  const opened=openCheckout(id);
  if(opened){const overlay=$('checkoutOverlay');overlay.classList.add('show');overlay.style.display='block';overlay.setAttribute('aria-modal','true');document.body.classList.add('checkout-open');}
}

function buyNowAfterLogin(id){buyNow(id)}
function changeQty(id,n){let x=cart.find(i=>i.id===id);if(!x)return;x.qty+=n;if(x.qty<=0){cart=cart.filter(i=>i.id!==id);selectedCartIds.delete(id)}save()}
function renderCart(){
  let total=0,count=0,selectedTotal=0,selectedCount=0;
  if(!cart.length){
    $('cartItems').innerHTML='<div style="text-align:center;color:#888;padding:60px 10px">Keranjang masih kosong.<br>Yuk pilih produk DIMSUM!</div>';
  }else{
    const allSelected=cart.length>0 && cart.every(i=>selectedCartIds.has(i.id));
    $('cartItems').innerHTML=`<div class="cart-select-all"><label><input type="checkbox" ${allSelected?'checked':''} onchange="toggleSelectAll(this.checked)"><span>Pilih Semua</span></label><small>${cart.length} produk</small></div>`+
      cart.map(i=>{
        let p=products.find(x=>x.id===i.id); if(!p)return '';
        const checked=selectedCartIds.has(i.id);
        total+=p.price*i.qty; count+=i.qty;
        if(checked){selectedTotal+=p.price*i.qty;selectedCount+=i.qty}
        return `<div class="cart-row ${checked?'cart-row-selected':''}">
          <label class="cart-check"><input type="checkbox" ${checked?'checked':''} onchange="toggleCartSelection(${p.id})"></label>
          <div class="cart-thumb">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div>
          <div class="cart-main"><h4>${p.name}</h4><small>${rupiah(p.price)}</small><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${p.id},1)">+</button></div></div>
          <b>${rupiah(p.price*i.qty)}</b>
        </div>`
      }).join('');
  }
  const cartTotalEl=$('cartTotal'); if(cartTotalEl) cartTotalEl.textContent=rupiah(selectedTotal);
  const totalEl=$('cartGrandTotal'); if(totalEl) totalEl.textContent=rupiah(selectedTotal);
  const countEl=$('cartSelectedCount'); if(countEl) countEl.textContent=selectedCount+' produk dipilih';
  const headerCount=$('marketCartCount');if(headerCount)headerCount.textContent=count;const bottomCount=$('bottomCartCount');if(bottomCount)bottomCount.textContent=count;
}
function openCart(){const panel=$('cart'),overlay=$('overlay');if(!panel||!overlay)return;panel.classList.add('open');overlay.classList.add('show');document.querySelector('.topbar')?.classList.remove('home-hidden');renderCart()}function closeCart(){ $('cart').classList.remove('open');$('overlay').classList.remove('show');if(!$('simpleModal')?.classList.contains('show'))document.querySelector('.topbar')?.classList.remove('home-hidden')}
function openCheckout(forceProductId){
  // Normalisasi ID dari localStorage agar ID angka/string tidak membuat produk hilang.
  cart=(Array.isArray(cart)?cart:[]).map(i=>({id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)})).filter(i=>products.some(p=>p.id===i.id));
  let selected=[];
  if(forceProductId!==undefined && forceProductId!==null){
    const id=Number(forceProductId),product=products.find(p=>p.id===id);
    if(!product){alert('Produk tidak ditemukan.');return false;}
    let item=cart.find(i=>i.id===id);
    if(!item){item={id,qty:1};cart.push(item);}
    item.qty=Math.max(1,Number(item.qty)||1);
    selectedCartIds=new Set([id]);
    selected=[item];
  }else{
    selected=getSelectedCartItems().filter(i=>products.some(p=>p.id===Number(i.id)));
    if(!selected.length){selected=cart.slice();selectedCartIds=new Set(selected.map(i=>Number(i.id)));}
  }
  if(!selected.length){alert('Pilih minimal satu produk untuk checkout.');return false;}
  selected=selected.map(i=>({id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)}));
  checkoutActiveItems=selected.map(i=>({id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)}));
  // Pastikan state global persis sama dengan item yang dirender pada checkout.
  selectedCartIds=new Set(selected.map(i=>i.id));
  localStorage.setItem('dinsumCart',JSON.stringify(cart));
  localStorage.setItem('dinsumSelectedCartIds',JSON.stringify([...selectedCartIds]));
  closeCart();
  const u=getUser();
  if($('checkoutName'))$('checkoutName').textContent=u?.name||'Pelanggan';
  if($('checkoutAddress'))$('checkoutAddress').textContent=u?.address||'Silakan isi alamat pengiriman saat konfirmasi pesanan';
  let subtotal=0,count=0;
  $('checkoutProducts').innerHTML=selected.map(i=>{
    const p=products.find(x=>x.id===Number(i.id));if(!p)return '';
    const qty=Math.max(1,Number(i.qty)||1);subtotal+=p.price*qty;count+=qty;
    return `<div class="checkout-product"><div class="mini">${p.image?`<img class="product-photo" src="${p.image}" alt="${p.name}">`:''}</div><div class="cp-info"><b>${p.name}</b><span>${rupiah(p.price)} / produk</span>${Number(p.id)===Number(forceProductId)?`<small class="checkout-variant-label">Varian: ${localStorage.getItem('dinsumCheckoutVariant')||'Frozen (beku)'}</small>`:''}<div class="checkout-qty-row"><span>Jumlah: ${qty}</span></div></div><strong class="cp-total">${rupiah(p.price*qty)}</strong></div>`;
  }).join('');
  $('checkoutItemsText').textContent='';
  $('checkoutSubtotal').textContent=rupiah(subtotal);
  updateFooterCheckoutQty(selected);
  const qtyControl=$('checkoutFooterQty');if(qtyControl){qtyControl.hidden=false;qtyControl.style.display='inline-flex';}
  if($('checkoutVoucher'))$('checkoutVoucher').value=selectedVoucher;
  applyCheckoutVoucher();
  document.querySelectorAll('[data-payment-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.paymentChoice===selectedPayment.name));
  document.querySelectorAll('[data-shipping-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.shippingChoice===selectedShipping.name));
  const pickupToggle=$('pickupAtStoreToggle');if(pickupToggle)pickupToggle.checked=pickupAtStore;
  syncPickupUI();
  const overlay=$('checkoutOverlay');overlay.classList.add('show');overlay.style.display='block';
  ['.voucher-checkout','.shipping-card','.payment-card'].forEach(sel=>{const card=document.querySelector('#checkoutOverlay '+sel);if(card)card.classList.remove('choices-open')});
  const voucherPanel=$('voucherOptionsPanel');if(voucherPanel)voucherPanel.hidden=true;const voucherCard=document.querySelector('#checkoutOverlay .voucher-checkout');if(voucherCard)voucherCard.classList.remove('choices-open');const voucherMore=voucherCard?.querySelector('.voucher-more-btn');if(voucherMore)voucherMore.textContent='Pilihan lainnya ›';
  document.querySelectorAll('#checkoutOverlay .card-title button').forEach(b=>{if(b.closest('.shipping-card,.payment-card'))b.textContent='Pilihan lainnya ›'});
  recalculateCheckoutTotals();
  return true;
}
function toggleVoucherOptions(){const panel=$('voucherOptionsPanel'),card=document.querySelector('#checkoutOverlay .voucher-checkout'),btn=card?.querySelector('.voucher-more-btn');if(!panel||!card)return;const opening=!card.classList.contains('choices-open');card.classList.toggle('choices-open',opening);panel.hidden=!opening;if(btn)btn.textContent=opening?'Tutup pilihan ↑':'Pilihan lainnya ›';if(opening)panel.scrollIntoView({behavior:'smooth',block:'nearest'})}
function applyCheckoutVoucher(){selectedVoucher=$('checkoutVoucher')?.value||'none';const messages={none:'Pilih voucher yang sesuai untuk menghemat belanja.',shipping:'Voucher Gratis Ongkir dipilih. Biaya kirim dipotong hingga Rp12.000.',shippingplus:'Voucher Gratis Ongkir Ekstra dipilih. Biaya kirim dipotong hingga Rp12.000.',discount:'Voucher Diskon 10% dipilih, maksimal potongan Rp15.000.',discount5:'Voucher potongan Rp5.000 dipilih. Berlaku untuk subtotal minimal Rp50.000.',combo:'Promo Hemat dipilih: diskon 5% dan gratis ongkir.'};if($('voucherMessage'))$('voucherMessage').textContent=messages[selectedVoucher]||messages.none;const titles={none:'Tanpa Voucher',shipping:'Gratis Ongkir aktif',shippingplus:'Gratis Ongkir Ekstra aktif',discount:'Diskon 10% aktif',discount5:'Potongan Rp5.000 aktif',combo:'Promo Hemat aktif'};const summaries={none:'Gunakan promo agar belanja lebih hemat',shipping:'Potongan biaya pengiriman diterapkan',shippingplus:'Potongan ongkir ekstra diterapkan',discount:'Potongan hingga Rp15.000 diterapkan',discount5:'Potongan Rp5.000 diterapkan',combo:'Diskon 5% dan gratis ongkir diterapkan'};if($('voucherSummaryTitle'))$('voucherSummaryTitle').textContent=titles[selectedVoucher];if($('voucherSummaryText'))$('voucherSummaryText').textContent=summaries[selectedVoucher];const currentVoucher=$('voucherCurrentSummary');if(currentVoucher){const icon=currentVoucher.querySelector('.voucher-current-icon');if(icon)icon.textContent=selectedVoucher==='shipping'||selectedVoucher==='shippingplus'?'🚚':selectedVoucher==='discount'?'％':selectedVoucher==='discount5'?'Rp':selectedVoucher==='combo'?'🎟️':'×';}document.querySelectorAll('.voucher-options [data-voucher]').forEach(b=>{const active=b.dataset.voucher===selectedVoucher;b.classList.toggle('selected',active);const label=b.querySelector('.voucher-pick');if(label)label.textContent=active?'✓ Dipakai':'Pakai'});recalculateCheckoutTotals()}
function selectCheckoutVoucher(value){if(!$('checkoutVoucher'))return;$('checkoutVoucher').value=value;applyCheckoutVoucher();const panel=$('voucherOptionsPanel'),card=document.querySelector('#checkoutOverlay .voucher-checkout');if(panel)panel.hidden=true;if(card)card.classList.remove('choices-open');if($('voucherOpenArrow'))$('voucherOpenArrow').textContent='›'}
function openVoucher(){
  const overlay=$('voucherOverlay');if(!overlay)return;
  document.querySelectorAll('#voucherOverlay [data-voucher]').forEach(b=>{const active=b.dataset.voucher===selectedVoucher;b.classList.toggle('selected',active);const radio=b.querySelector('i');if(radio)radio.textContent=active?'●':'○'});
  overlay.classList.add('show');
}
function closeVoucher(){$('voucherOverlay')?.classList.remove('show')}
function chooseVoucher(value){selectedVoucher=value;document.querySelectorAll('#voucherOverlay [data-voucher]').forEach(b=>{const active=b.dataset.voucher===value;b.classList.toggle('selected',active);const radio=b.querySelector('i');if(radio)radio.textContent=active?'●':'○'});if($('checkoutVoucher'))$('checkoutVoucher').value=value;applyCheckoutVoucher();closeVoucher()}
function confirmVoucher(){
  const select=$('checkoutVoucher');if(select)select.value=selectedVoucher;
  applyCheckoutVoucher();closeVoucher();
}
function recalculateCheckoutTotals(){
  let subtotal=0;
  getSelectedCartItems().forEach(i=>{const p=products.find(x=>Number(x.id)===Number(i.id));if(p)subtotal+=p.price*Math.max(1,Number(i.qty)||1)});
  let shipping=pickupAtStore?0:(Number(selectedShipping.cost)||0),discount=0;
  if(pickupAtStore)shipping=0;
  else if(selectedVoucher==='shipping'||selectedVoucher==='shippingplus')shipping=0;
  else if(selectedVoucher==='discount')discount=Math.min(15000,Math.round(subtotal*.10));
  else if(selectedVoucher==='discount5')discount=subtotal>=50000?5000:0;
  else if(selectedVoucher==='combo'){shipping=0;discount=Math.round(subtotal*.05)}
  const total=Math.max(0,subtotal+shipping+2000-discount);
  if($('checkoutSubtotal'))$('checkoutSubtotal').textContent=rupiah(subtotal);
  if($('checkoutShippingCost'))$('checkoutShippingCost').textContent=rupiah(shipping);
  if($('checkoutFooterSubtotal'))$('checkoutFooterSubtotal').textContent=rupiah(subtotal);
  if($('checkoutFooterShipping'))$('checkoutFooterShipping').textContent=rupiah(shipping);
  if($('checkoutDiscount'))$('checkoutDiscount').textContent='−'+rupiah(discount);
  if($('checkoutTotal'))$('checkoutTotal').textContent=rupiah(total);
}
function updateFooterCheckoutQty(selected=getSelectedCartItems()){
  const wrap=$('checkoutFooterQty');if(!wrap)return;
  const candidates=Array.isArray(selected)?selected:[];
  let item=candidates.find(i=>products.some(p=>Number(p.id)===Number(i.id)));
  if(!item)item=cart.find(i=>products.some(p=>Number(p.id)===Number(i.id)));
  wrap.hidden=false;wrap.style.display='inline-flex';wrap.style.visibility='visible';
  if(!item){wrap.dataset.productId='';const value=$('checkoutFooterQtyValue');if(value)value.textContent='1';return;}
  wrap.dataset.productId=String(Number(item.id));
  const value=$('checkoutFooterQtyValue');if(value)value.textContent=String(Math.max(1,Number(item.qty)||1));
  const minus=wrap.querySelector('button[aria-label="Kurangi jumlah"]');if(minus)minus.disabled=Number(item.qty||1)<=1;
}
function changeFooterCheckoutQty(delta){
  const wrap=$('checkoutFooterQty');
  if(!wrap)return;
  const rows=[...document.querySelectorAll('#checkoutProducts .checkout-product')];
  let id=Number(wrap.dataset.productId);
  if(!Number.isFinite(id)||!products.some(p=>Number(p.id)===id)){
    const name=rows[0]?.querySelector('.cp-info b')?.textContent?.trim();
    const match=products.find(p=>p.name===name);
    if(match)id=Number(match.id);
  }
  const product=products.find(p=>Number(p.id)===id);
  if(!product)return;
  let item=cart.find(i=>Number(i.id)===id);
  if(!item){item={id,qty:1};cart.push(item)}
  item.qty=Math.max(1,Math.min(99,(Number(item.qty)||1)+(Number(delta)||0)));
  wrap.dataset.productId=String(id);
  selectedCartIds=new Set([id]);
  localStorage.setItem('dinsumCart',JSON.stringify(cart));
  localStorage.setItem('dinsumSelectedCartIds',JSON.stringify([id]));
  const qty=item.qty;
  const value=$('checkoutFooterQtyValue'); if(value)value.textContent=String(qty);
  const minus=wrap.querySelector('[data-checkout-qty="minus"]'); if(minus)minus.disabled=qty<=1;
  rows.forEach(row=>{
    const rowName=row.querySelector('.cp-info b')?.textContent?.trim();
    if(rowName===product.name){
      const label=row.querySelector('.checkout-qty-row span'); if(label)label.textContent='Jumlah: '+qty;
      const lineTotal=row.querySelector('.cp-total'); if(lineTotal)lineTotal.textContent=rupiah(product.price*qty);
    }
  });
  if($('checkoutItemsText'))$('checkoutItemsText').textContent='';
  if($('checkoutSubtotal'))$('checkoutSubtotal').textContent=rupiah(product.price*qty);
  if($('checkoutFooterSubtotal'))$('checkoutFooterSubtotal').textContent=rupiah(product.price*qty);
  recalculateCheckoutTotals();
  renderCart();
}
// Satu fungsi pembuka yang dipakai ikon header dan tombol + Keranjang.
function forceOpenCartPanel(){
  closeCheckout();
  closeSimple();
  const panel=$('cart'), overlay=$('overlay');
  if(!panel || !overlay) return;
  renderCart();
  panel.classList.add('open');
  overlay.classList.add('show');
  document.querySelector('.topbar')?.classList.remove('home-hidden');
}
function addToCartAndOpen(id){
  const ok=addToCart(id);
  if(ok!==false) forceOpenCartPanel();
  return false;
}
function addDetailToCartAndOpen(){
  addDetailToCart();
  forceOpenCartPanel();
  return false;
}
document.addEventListener('click',function(event){
  const cardButton=event.target.closest('#productGrid .add');
  if(cardButton){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const inline=cardButton.getAttribute('onclick')||'';
    const match=inline.match(/addToCart(?:AndOpen)?\((\d+)\)/);
    const productId=match?Number(match[1]):Number(cardButton.dataset.productId);
    if(productId) addToCartAndOpen(productId);
    return;
  }
  const detailButton=event.target.closest('#simpleContent .detail-actions button:first-child');
  if(detailButton){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    addDetailToCartAndOpen();
  }
},true);

// Event delegation in capture phase ensures the controls work even if other checkout
// layers or older inline handlers interfere with button clicks.
document.addEventListener('click',function(event){
  const button=event.target.closest('#checkoutFooterQty [data-checkout-qty]');
  if(!button)return;
  event.preventDefault(); event.stopPropagation();
  const delta=button.dataset.checkoutQty==='plus'?1:-1;
  changeFooterCheckoutQty(delta);
},true);
window.changeFooterCheckoutQty=changeFooterCheckoutQty;

function changeCheckoutQty(id,delta){
  const wrap=$('checkoutFooterQty');if(wrap)wrap.dataset.productId=String(Number(id));
  changeFooterCheckoutQty(delta);
}
function closeCheckout(){const el=$('checkoutOverlay');if(el){el.classList.remove('show');el.style.display='';el.removeAttribute('aria-modal')}document.body.classList.remove('checkout-open')}
function openPayment(){const checkout=$('checkoutOverlay');const card=document.querySelector('#checkoutOverlay .payment-card');if(!checkout?.classList.contains('show')){const overlay=$('paymentOverlay');if(!overlay)return;overlay.classList.add('show');overlay.style.setProperty('display','flex','important');document.querySelectorAll('#paymentOverlay .payment-list button').forEach(b=>{const name=(b.getAttribute('onclick')||'').match(/selectPayment\('([^']+)'/ )?.[1];b.classList.toggle('selected',name===selectedPayment.name);const mark=b.querySelector('i');if(mark)mark.textContent=name===selectedPayment.name?'●':'○'});return}if(!card)return;const opening=!card.classList.contains('choices-open');card.classList.toggle('choices-open',opening);const trigger=card.querySelector('.card-title button');if(trigger)trigger.textContent=opening?'Tutup pilihan ↑':'Pilihan lainnya ›';if(opening)card.scrollIntoView({behavior:'smooth',block:'nearest'});document.querySelectorAll('[data-payment-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.paymentChoice===selectedPayment.name))}
function closePayment(){const overlay=$('paymentOverlay');if(overlay){overlay.classList.remove('show');overlay.style.removeProperty('display')}}
function togglePickupAtStore(checked){pickupAtStore=!!checked;syncPickupUI();recalculateCheckoutTotals()}
function syncPickupUI(){const card=document.querySelector('#checkoutOverlay .shipping-card'),toggle=$('pickupAtStoreToggle'),summary=$('selectedShipping');if(toggle)toggle.checked=pickupAtStore;if(card){card.classList.toggle('shipping-locked',pickupAtStore);const trigger=card.querySelector('.card-title button');if(trigger){trigger.disabled=pickupAtStore;trigger.textContent=pickupAtStore?'Terkunci saat ambil di toko':'Pilihan lainnya ›';}}if(summary&&pickupAtStore){summary.innerHTML='<img src="assets/pickup.svg" alt=""><div><b>Jasa pengiriman tidak diperlukan</b><span>Ambil langsung di toko · Ongkir Rp0</span></div><strong>●</strong>';}else if(summary){summary.innerHTML=`<img src="${selectedShipping.img}"><div><b>${selectedShipping.name==='JNE'?'JNE Express':selectedShipping.name}</b><span>${selectedShipping.estimate} · ${rupiah(selectedShipping.cost)}</span></div><strong>✓</strong>`;}document.querySelectorAll('[data-shipping-choice]').forEach(b=>{b.disabled=pickupAtStore;b.classList.toggle('selected',!pickupAtStore&&b.dataset.shippingChoice===selectedShipping.name);});}
function openShipping(){if(pickupAtStore)return;const checkout=$('checkoutOverlay');const card=document.querySelector('#checkoutOverlay .shipping-card');if(!checkout?.classList.contains('show')){const overlay=$('shippingOverlay');if(!overlay)return;overlay.classList.add('show');overlay.style.setProperty('display','flex','important');document.querySelectorAll('#shippingOverlay .payment-list button').forEach(b=>{const name=(b.getAttribute('onclick')||'').match(/selectShipping\('([^']+)'/ )?.[1];b.classList.toggle('selected',name===selectedShipping.name);const mark=b.querySelector('i');if(mark)mark.textContent=name===selectedShipping.name?'●':'○'});return}if(!card)return;const opening=!card.classList.contains('choices-open');card.classList.toggle('choices-open',opening);const trigger=card.querySelector('.card-title button');if(trigger)trigger.textContent=opening?'Tutup pilihan ↑':'Pilihan lainnya ›';if(opening)card.scrollIntoView({behavior:'smooth',block:'nearest'});document.querySelectorAll('[data-shipping-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.shippingChoice===selectedShipping.name))}
function closeShipping(){const overlay=$('shippingOverlay');if(overlay){overlay.classList.remove('show');overlay.style.removeProperty('display')}}
function selectShipping(name,img,estimate,cost){if(pickupAtStore)return;selectedShipping={name,img,estimate,cost:Number(String(cost).replace(/\D/g,''))};document.querySelectorAll('#shippingOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#shippingOverlay .payment-list button i').forEach(i=>i.textContent='○');let chosen=[...document.querySelectorAll('#shippingOverlay .payment-list button')].find(b=>b.getAttribute('onclick')?.includes(`'${name}'`));if(chosen){chosen.classList.add('selected');let radio=chosen.querySelector('i');if(radio)radio.textContent='●'}document.querySelectorAll('[data-shipping-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.shippingChoice===name));const summary=$('selectedShipping');if(summary)summary.innerHTML=`<img src="${img}"><div><b>${name==='JNE'?'JNE Express':name}</b><span>${estimate} · ${rupiah(selectedShipping.cost)}</span></div><strong>✓</strong>`;const card=document.querySelector('#checkoutOverlay .shipping-card');if(card){card.classList.remove('choices-open');const trigger=card.querySelector('.card-title button');if(trigger)trigger.textContent='Pilihan lainnya ›'}closeShipping();recalculateCheckoutTotals()}
function confirmShipping(){closeShipping()}
function selectPayment(name,img){selectedPayment={name,img};document.querySelectorAll('#paymentOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#paymentOverlay .payment-list button i').forEach(i=>i.textContent='○');let chosen=[...document.querySelectorAll('#paymentOverlay .payment-list button')].find(b=>b.getAttribute('onclick')?.includes(`'${name}'`));if(chosen){chosen.classList.add('selected');let radio=chosen.querySelector('i');if(radio)radio.textContent='●'}document.querySelectorAll('[data-payment-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.paymentChoice===name));const group=['BRI','BCA','BNI','Mandiri'].includes(name)?'Transfer Bank':['DANA','OVO','GoPay'].includes(name)?'E-Wallet':name==='COD'?'Bayar di Tempat':name==='QRIS'?'Pembayaran QRIS':'Metode Pembayaran';const summary=$('selectedPayment');if(summary)summary.innerHTML=`<img src="${img}"><div><b>${group}</b><span>${name}</span></div><strong>✓</strong>`;const card=document.querySelector('#checkoutOverlay .payment-card');if(card){card.classList.remove('choices-open');const trigger=card.querySelector('.card-title button');if(trigger)trigger.textContent='Pilihan lainnya ›'}closePayment()}
function confirmPayment(){closePayment()}
function checkoutAddToCart(){
  const selected=getSelectedCartItems();
  if(!selected.length)return alert('Pilih minimal satu produk terlebih dahulu.');
  // Produk sudah tersimpan di keranjang; tombol ini membawa pengguna kembali ke keranjang.
  closeCheckout();closeSimple();openCart();
}
function addOrderNotification(orderId,title,message,status='Dikemas'){
  const notifications=JSON.parse(localStorage.getItem('dinsumNotifications')||'[]');
  notifications.unshift({id:'NTF-'+Date.now(),orderId,title,message,status,date:new Date().toLocaleString('id-ID'),read:false});
  localStorage.setItem('dinsumNotifications',JSON.stringify(notifications));
}
function placeOrder(){
  // Kunci item checkout saat tombol ditekan agar pesanan tidak bergantung pada keranjang yang berubah.
  const selected=(Array.isArray(checkoutActiveItems)?checkoutActiveItems:[])
    .map(i=>({id:Number(i.id),qty:Math.max(1,Number(i.qty)||1)}))
    .filter(i=>products.some(p=>Number(p.id)===i.id));
  if(!selected.length){
    alert('Produk checkout tidak ditemukan. Silakan pilih produk dan coba lagi.');
    return false;
  }

  const now=new Date();
  const orderId='DNS-'+now.getTime().toString().slice(-6);
  let orders=[];
  try { orders=readOrders(); if(!Array.isArray(orders))orders=[]; } catch(e) { orders=[]; }
  const subtotal=selected.reduce((sum,i)=>{const p=products.find(x=>Number(x.id)===i.id);return sum+(p?p.price*i.qty:0)},0);
  const baseShipping=pickupAtStore?0:(Number(selectedShipping?.cost)||12000);
  const shippingCost=pickupAtStore?0:((selectedVoucher==='shipping'||selectedVoucher==='shippingplus'||selectedVoucher==='combo')?0:baseShipping);
  const discount=selectedVoucher==='discount'?Math.min(15000,Math.round(subtotal*.10)):selectedVoucher==='discount5'&&subtotal>=50000?5000:selectedVoucher==='combo'?Math.round(subtotal*.05):0;
  const total=Math.max(0,subtotal+shippingCost+2000-discount);
  const order={
    id:orderId,date:now.toLocaleString('id-ID'),createdAt:now.toLocaleString('id-ID'),items:selected,
    subtotal,shippingCost,discount,total,payment:selectedPayment?.name||'BRI',
    shipping:pickupAtStore?'Ambil langsung di toko':(selectedShipping?.name||'J&T Express'),shippingEstimate:pickupAtStore?'Ambil pesanan langsung di toko':(selectedShipping?.estimate||'Estimasi 2–4 hari'),
    voucher:selectedVoucher,status:'Dikemas'
  };

  // Simpan pesanan terlebih dahulu. Jangan biarkan pembaruan keranjang menghalangi perpindahan halaman.
  orders.unshift(order);
  try { localStorage.setItem('dinsumOrders',JSON.stringify(orders)); }
  catch(e){ alert('Pesanan tidak dapat disimpan di browser. Periksa ruang penyimpanan browser lalu coba lagi.'); return false; }

  try { addOrderNotification(orderId,'Pesanan berhasil dibuat','Pesanan '+orderId+' berhasil dibuat dan sekarang berstatus Sedang Dikemas.','Dikemas'); } catch(e) {}
  const purchasedIds=new Set(selected.map(i=>i.id));
  try {
    cart=(Array.isArray(cart)?cart:[]).filter(i=>!purchasedIds.has(Number(i.id)));
    selectedCartIds=new Set(cart.map(i=>Number(i.id)));
    localStorage.setItem('dinsumCart',JSON.stringify(cart));
    localStorage.setItem('dinsumSelectedCartIds',JSON.stringify([...selectedCartIds]));
    renderCart();
  } catch(e) { console.warn('Keranjang tidak sempat diperbarui:',e); }

  selectedVoucher='none';
  checkoutActiveItems=[];
  // Paksa semua lapisan checkout ditutup sebelum halaman pesanan dibuka.
  const checkout=$('checkoutOverlay');
  if(checkout){checkout.classList.remove('show');checkout.style.display='none';checkout.removeAttribute('aria-modal');}
  const cartPanel=$('cart'); if(cartPanel)cartPanel.classList.remove('open');
  const cartOverlay=$('overlay'); if(cartOverlay)cartOverlay.classList.remove('show');
  const modal=$('simpleModal'); if(modal)modal.classList.remove('show');
  document.body.classList.remove('checkout-open','page-view-open');
  document.querySelector('.topbar')?.classList.add('home-hidden');

  // Buka tab Semua setelah lapisan checkout benar-benar ditutup.
  const openOrders=()=>{
    try {
      showOrders('Semua');
    } catch(e) {
      console.error('Tampilan pesanan gagal dirender:',e);
      const fallback=`<div class="orders-page"><div class="order-success-inline"><div class="order-success-inline-check">✓</div><div class="order-success-inline-copy"><b>Pembelian berhasil!</b><span>Pesanan ${orderId} berhasil dibuat dan berstatus Dikemas.</span></div></div><div class="order-card"><b>Pesanan ${orderId}</b><p>Status: Dikemas</p><p>Total: ${rupiah(total)}</p></div></div>`;
      simple('Pesanan Saya',fallback,'orders');
    }
    setBottomNav('Orders');
    const orderPage=document.querySelector('#simpleModal .orders-page');
    if(orderPage&&!orderPage.querySelector('.order-success-inline')){
      const notice=document.createElement('section');
      notice.className='order-success-inline';
      notice.innerHTML=`<div class="order-success-inline-check" aria-hidden="true">✓</div><div class="order-success-inline-copy"><b>Pembelian berhasil!</b><span>Pesanan ${orderId} sudah masuk ke tahap <strong>Sedang Dikemas</strong>.</span></div>`;
      // Letakkan notifikasi tepat di bawah banner 'Pesanan Saya', bukan di atas banner.
      const tabs=orderPage.querySelector('.order-tabs');
      if(tabs) tabs.insertAdjacentElement('afterend',notice);
      else { const ordersBanner=orderPage.querySelector('.orders-hero'); if(ordersBanner) ordersBanner.insertAdjacentElement('afterend',notice); else orderPage.prepend(notice); }
    }
    window.scrollTo({top:0,behavior:'auto'});
  };
  openOrders();
  // Jalankan sekali lagi setelah browser menyelesaikan perubahan tampilan, mencegah checkout menutupi halaman pesanan.
  window.setTimeout(()=>{
    if(!$('simpleModal')?.classList.contains('show') || !$('simpleContent')?.querySelector('.orders-page')) openOrders();
    setBottomNav('Orders');
  },80);
  return false;
}
function setBottomNav(active){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));const el=document.getElementById('nav'+active);if(el)el.classList.add('active')}
function setBottomNav(active){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));const el=document.getElementById('nav'+active);if(el)el.classList.add('active')}
function simple(title,html,type=''){
  document.querySelector('.topbar')?.classList.add('home-hidden');
  const modal=$('simpleModal');
  const card=modal.querySelector('.simple-card');
  card.className='simple-card '+(type?type+'-modal-card':'');
  $('simpleContent').innerHTML=`<div class="page-title"><button class="page-back" onclick="goHome()">‹</button><h2>${title}</h2></div>${html}`;
  modal.classList.add('show');
  document.body.classList.add('page-view-open');
  setBottomNav(type==='account'?'Account':type==='orders'?'Orders':type==='live'?'Live':'Home');
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeSimple(){ $('simpleModal').classList.remove('show'); document.body.classList.remove('page-view-open'); setBottomNav('Home'); if(!$('cart')?.classList.contains('open'))document.querySelector('.topbar')?.classList.remove('home-hidden'); }
function showLive(){
 const html=`<div class="live-page kel5-social-page">
   <div class="social-topbar">
     <button class="social-plus" onclick="openCreatorMenu()" aria-label="Buat video"><span>+</span></button>
     <div class="social-tabs"><button class="social-tab active" onclick="switchLiveTab('live',this)">Live</button><button class="social-tab" onclick="switchLiveTab('video',this)">Video</button><button class="social-tab" onclick="switchLiveTab('following',this)">Mengikuti</button></div>
     <button class="social-more" onclick="alert('Pengaturan Live & Video')">⋯</button>
   </div>
   <div class="video-shop-banner"><div><b>🛍️ KEL 5 Video</b><span>Video pendek + belanja produk</span></div><button onclick="openCreatorMenu()">＋ Buat</button></div>
   <div class="social-feed" id="socialFeed">
     <section class="social-panel" data-tab="live">
       <div class="feed-head"><div><b>Live Sekarang</b><span>Belanja sambil nonton live</span></div></div>
       <div class="vertical-grid live-vertical-grid">
         <article class="vertical-card" onclick="startRealLive()"><div class="vertical-media live-media red"><span class="live-badge">● LIVE</span><strong>DIMSUM</strong><small>1,2 rb menonton</small><div class="media-gradient"></div></div><b>Live Promo KEL 5</b><p>Diskon dan produk terlaris</p><button class="video-product-btn" onclick="event.stopPropagation();buyNow(1)">🛒 Lihat produk · Rp89.000</button></article>
         <article class="vertical-card" onclick="startRealLive()"><div class="vertical-media live-media dark"><span class="live-badge">● LIVE</span><strong>UNBOXING</strong><small>856 menonton</small><div class="media-gradient"></div></div><b>Unboxing Produk Baru</b><p>Lihat produk terbaru KEL 5</p><button class="video-product-btn" onclick="event.stopPropagation();buyNow(3)">🛒 Lihat produk · Rp59.000</button></article>
       </div>
       <div id="liveStage" class="live-stage hidden"><div class="live-stage-head"><b>🔴 KEL 5 Live</b><button class="live-close" onclick="stopRealLive()" aria-label="Tutup kamera">✕</button></div><div class="live-camera-wrap"><video id="livePreview" autoplay muted playsinline></video></div><div class="live-stage-foot"><span id="liveStatus">Live aktif</span><span>👁 1 penonton</span></div></div>
     </section>
     <section class="social-panel hidden" data-tab="video">
       <div class="feed-head"><div><b>Video Belanja</b><span>Geser ke bawah · pilih produk langsung dari video</span></div><button onclick="openCreatorMenu()">＋ Buat Video</button></div>
       <div id="uploadedVideoGrid" class="video-shop-feed">
         ${videoShopCard('assets/videos/dimsum-promo.mp4','Promo Spesial KEL 5','Promo DIMSUM hari ini',1,'@kel5official','1,2 rb')}
         ${videoShopCard('','🔥 Promo Terlaris Hari Ini','Hoodie dan outfit favorit minggu ini',2,'@kel5official','856')}
         ${videoShopCard('','✨ Produk Baru KEL 5','Lihat koleksi terbaru kami',3,'@kel5official','623')}
       </div>
     </section>
     <section class="social-panel hidden" data-tab="following">
       <div class="feed-head"><div><b>Mengikuti</b><span>Konten dari KEL 5</span></div></div>
       <div class="following-empty"><div>♡</div><h3>Belum ada akun yang diikuti</h3><p>Nanti konten yang kamu ikuti akan muncul di sini.</p></div>
     </section>
   </div>
   <input id="videoUploadInput" class="hidden" type="file" accept="video/*" onchange="handleVideoUpload(this.files[0])">
   <input id="recordCameraInput" class="hidden" type="file" accept="video/*">
   <div id="recordStage" class="record-stage hidden"><div class="record-head"><b>🎥 Rekam Video</b><button onclick="closeRecordVideo()">✕</button></div><div class="record-camera-wrap"><video id="recordPreview" autoplay muted playsinline></video><span id="recordTimer">00:00</span></div><div class="record-actions"><button id="recordButton" class="record-main" onclick="toggleRecording()">● Mulai Rekam</button><button id="recordUseButton" class="hidden" onclick="useRecordedVideo()">✓ Gunakan Video</button></div></div>
 </div>`;
 simple('Live & Video',html,'live');
}
function videoShopCard(src,title,caption,pid,user,views){
 const p=products.find(x=>x.id===pid)||products[0];
 const media=src?`<video playsinline controls preload="metadata"><source src="${src}" type="video/mp4"></video>`:`<div class="video-placeholder"><span>${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><b>${title}</b><small>Video KEL 5</small></div>`;
 return `<article class="video-shop-card">
   <div class="video-main-media">${media}<div class="video-overlay"><span class="video-user">${user}</span><span>${views} tayangan</span></div></div>
   <div class="video-side-actions"><button onclick="addToCart(${p.id})">🛒<small>Keranjang</small></button><button onclick="buyNow(${p.id})">🛍️<small>Beli</small></button><button onclick="alert('Video dibagikan')">↗<small>Bagikan</small></button></div>
   <div class="video-caption"><b>${title}</b><p>${caption}</p><div class="linked-product"><span class="linked-product-icon">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><div><b>${p.name}</b><small>Terhubung ke produk · ${rupiah(p.price)}</small></div><button onclick="buyNow(${p.id})">Beli</button></div></div>
 </article>`;
}

function switchLiveTab(tab,btn){
 document.querySelectorAll('.social-tab').forEach(b=>b.classList.remove('active')); if(btn)btn.classList.add('active');
 document.querySelectorAll('.social-panel').forEach(p=>p.classList.toggle('hidden',p.dataset.tab!==tab));
}
function openCreatorMenu(){
 const existing=document.getElementById('creatorMenu');
 if(existing){existing.classList.add('show');return;}
 const menu=document.createElement('div');
 menu.id='creatorMenu'; menu.className='creator-menu-overlay';
 menu.innerHTML=`<div class="creator-menu">
   <div class="creator-menu-head"><b>Buat Konten</b><button onclick="closeCreatorMenu()">✕</button></div>
   <button onclick="closeCreatorMenu();$('videoUploadInput')?.click()"><span class="creator-menu-icon upload">↑</span><div><b>Upload Video</b><small>Pilih video dari perangkat</small></div><strong>›</strong></button>
   <button onclick="closeCreatorMenu();startRecordVideo()"><span class="creator-menu-icon record">●</span><div><b>Rekam Video</b><small>Gunakan kamera dan mikrofon</small></div><strong>›</strong></button>
   <button onclick="closeCreatorMenu();startRealLive()"><span class="creator-menu-icon live">LIVE</span><div><b>Mulai Live</b><small>Siarkan langsung dari kamera</small></div><strong>›</strong></button>
 </div>`;
 menu.addEventListener('click',e=>{if(e.target===menu)closeCreatorMenu()});
 document.body.appendChild(menu); requestAnimationFrame(()=>menu.classList.add('show'));
}
function closeCreatorMenu(){const m=document.getElementById('creatorMenu');if(m){m.classList.remove('show');setTimeout(()=>m.remove(),180);}}
function handleVideoUpload(file){
 if(!file)return;
 const grid=$('uploadedVideoGrid'); if(!grid)return;
 window.pendingVideoUpload={file,url:URL.createObjectURL(file)};
 showVideoProductPicker('upload');
}
function showVideoProductPicker(mode){
 const old=$('videoProductPicker'); if(old)old.remove();
 const box=document.createElement('div'); box.id='videoProductPicker'; box.className='video-picker-overlay';
 box.innerHTML=`<div class="video-picker"><div class="video-picker-head"><b>🛍️ Tautkan Produk</b><button onclick="closeVideoProductPicker()">✕</button></div><p>Pilih produk yang tampil di video agar penonton bisa langsung belanja.</p><div class="video-picker-list">${products.map(p=>`<button onclick="finishVideoCreate(${p.id},'${mode}')"><span>${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><div><b>${p.name}</b><small>${rupiah(p.price)} · ${p.sold} terjual</small></div><strong>›</strong></button>`).join('')}</div></div>`;
 document.body.appendChild(box); requestAnimationFrame(()=>box.classList.add('show'));
}
function closeVideoProductPicker(){const x=$('videoProductPicker');if(x){x.classList.remove('show');setTimeout(()=>x.remove(),150);}window.pendingVideoUpload=null;}
function finishVideoCreate(pid,mode){
 const grid=$('uploadedVideoGrid'); if(!grid)return;
 const p=products.find(x=>x.id===pid)||products[0];
 if(mode==='upload'&&window.pendingVideoUpload){const q=window.pendingVideoUpload;grid.insertAdjacentHTML('afterbegin',videoShopCard(q.url,q.file.name,'Video saya · produk ditautkan',p.id,'@akun_kamu','Baru'));}
 else if(mode==='record'&&recordedUrl){grid.insertAdjacentHTML('afterbegin',videoShopCard(recordedUrl,'Video Rekaman KEL 5','Video saya · produk ditautkan',p.id,'@akun_kamu','Baru'));}
 closeVideoProductPicker(); closeRecordVideo(); switchLiveTab('video',document.querySelectorAll('.social-tab')[1]);
}


let liveStream=null;
async function startRealLive(){
  const stage=$('liveStage'), video=$('livePreview');
  if(!stage||!video)return;
  if(!navigator.mediaDevices?.getUserMedia){alert('Browser ini tidak mendukung akses kamera. Coba Chrome atau Edge.');return;}
  try{
    liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    video.srcObject=liveStream;stage.classList.remove('hidden');
    $('liveStatus').textContent='🔴 Live aktif dari kamera kamu';
  }catch(e){alert('Akses kamera/mikrofon ditolak atau tidak tersedia. Silakan izinkan akses kamera lalu coba lagi.');}
}
function stopRealLive(){try{if(liveStream){liveStream.getTracks().forEach(t=>t.stop());liveStream=null;}}catch(e){}const v=$('livePreview');if(v){v.pause?.();v.srcObject=null;}const s=$('liveStage');if(s)s.classList.add('hidden');}

let recordStream=null, mediaRecorder=null, recordedChunks=[], recordedUrl='', recordTimerId=null, recordSeconds=0;
async function startRecordVideo(){
  const stage=$('recordStage'), video=$('recordPreview'); if(!stage||!video)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('Browser ini belum mendukung perekaman kamera. Gunakan Chrome atau Edge versi terbaru.');return;}
  try{
    recordStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
    video.srcObject=recordStream; stage.classList.remove('hidden'); recordSeconds=0; updateRecordTimer();
  }catch(e){alert('Kamera/mikrofon tidak bisa diakses. Izinkan akses kamera dan mikrofon lalu coba lagi.');}
}
function updateRecordTimer(){const m=String(Math.floor(recordSeconds/60)).padStart(2,'0'),s=String(recordSeconds%60).padStart(2,'0');if($('recordTimer'))$('recordTimer').textContent=`${m}:${s}`;}
function toggleRecording(){
  if(mediaRecorder?.state==='recording'){mediaRecorder.stop();return;}
  if(!recordStream)return;
  recordedChunks=[]; mediaRecorder=new MediaRecorder(recordStream); mediaRecorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};
  mediaRecorder.onstop=()=>{clearInterval(recordTimerId);const blob=new Blob(recordedChunks,{type:mediaRecorder.mimeType||'video/webm'});if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=URL.createObjectURL(blob);if($('recordUseButton'))$('recordUseButton').classList.remove('hidden');if($('recordButton'))$('recordButton').textContent='● Rekam Lagi';};
  mediaRecorder.start(); recordSeconds=0; updateRecordTimer(); clearInterval(recordTimerId);recordTimerId=setInterval(()=>{recordSeconds++;updateRecordTimer()},1000); if($('recordButton'))$('recordButton').textContent='■ Berhenti';
}
function useRecordedVideo(){if(!recordedUrl)return;showVideoProductPicker('record');}
function closeRecordVideo(){try{if(mediaRecorder?.state==='recording')mediaRecorder.stop();}catch(e){}clearInterval(recordTimerId);if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null;}const v=$('recordPreview');if(v){v.pause?.();v.srcObject=null;}$('recordStage')?.classList.add('hidden');}

function readOrders(){
  try {
    const value=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');
    return Array.isArray(value)?value.filter(o=>o && typeof o==='object' && Array.isArray(o.items)):[];
  } catch(e) { return []; }
}

function orderTabs(filter){
  const tabs=[
    ['Semua','Semua','<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'],
    ['Belum Bayar','Belum Bayar','<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>'],
    ['Dikemas','Dikemas','<svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>'],
    ['Dikirim','Dikirim','<svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>'],
    ['Selesai','Selesai','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg>'],
    ['Dibatalkan','Batal','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>']
  ];
  const all=readOrders();
  return '<div class="order-tabs">'+tabs.map(([v,l,icon])=>{
    const count=v==='Semua'?all.length:all.filter(o=>o.status===v).length;
    const badge=count?'<em>'+count+'</em>':'';
    return '<button class="'+(v===filter?'active':'')+'" onclick="showOrders(\''+v+'\')"><span class="order-tab-icon">'+icon+'</span><span class="order-tab-label">'+l+'</span>'+badge+'</button>';
  }).join('')+'</div>';
}
function renderOrderCard(o){
  const items=o.items.map(i=>{const p=products.find(x=>x.id===i.id);return p?'<div class="order-item"><div class="order-thumb"><img class="product-photo" src="'+p.image+'" alt="'+p.name+'"></div><div><b>'+p.name+'</b><span>'+i.qty+' barang · '+rupiah(p.price*i.qty)+'</span></div></div>':''}).join('');
  const search=(o.id+' '+o.items.map(i=>{const p=products.find(x=>x.id===i.id);return p?p.name:''}).join(' ')).toLowerCase();
  const track=o.status==='Dikemas'?'<button onclick="simulateShipping(\''+o.id+'\')">Lacak Pesanan</button>':'';
  const canCancel=(o.status==='Belum Bayar'||o.status==='Dikemas');
  const cancel=canCancel?'<button class="cancel-order-btn" onclick="cancelOrder(\''+o.id+'\')">Batalkan Pesanan</button>':'';
  const statusIcon=o.status==='Dikemas'?'<svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>':o.status==='Dikirim'?'<svg viewBox="0 0 24 24"><path d="M2.5 6h11v11h-11zM13.5 10h4l4 4v3h-8z"/><circle cx="6.5" cy="19" r="2"/><circle cx="17.5" cy="19" r="2"/></svg>':o.status==='Selesai'?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg>':o.status==='Dibatalkan'?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>':'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/></svg>';
  return '<div class="order-card" data-search="'+search+'"><div class="order-card-head"><b><span class="order-brand-icon"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 11h20l-1.8 16H7.8L6 11Z"/><path d="M11 11V8a5 5 0 0 1 10 0v3"/><path d="M11 16v.1M21 16v.1"/></svg></span><span class="order-brand-copy"><strong>KEL 5</strong><small>Pesanan belanja</small></span></b><strong class="order-status-badge status-'+o.status.toLowerCase().replace(/\s+/g,'-')+'"><span class="order-status-icon">'+statusIcon+'</span> '+o.status+'</strong></div><div class="order-card-body">'+items+'<div class="order-meta"><span class="order-meta-line"><span class="order-meta-icon"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span>No. pesanan <b>'+o.id+'</b></span><span class="order-meta-line"><span class="order-meta-icon"><svg viewBox="0 0 24 24"><path d="M2.5 6h11v11h-11zM13.5 10h4l4 4v3h-8z"/><circle cx="6.5" cy="19" r="2"/><circle cx="17.5" cy="19" r="2"/></svg></span>Kurir '+(o.shipping||'J&T Express')+' <span>· '+(o.shippingEstimate||'Estimasi 2–4 hari')+'</span></span></div></div><div class="order-card-actions"><button onclick="showOrderDetail(\''+o.id+'\')"><span>☷</span> Lihat Detail</button>'+track+cancel+'</div></div>';

}
function showOrders(filter='Semua'){
  let orders=readOrders();
  const filtered=filter==='Semua'?orders:orders.filter(o=>o.status===filter);
  let html='<div class="orders-page"><div class="orders-hero"><div class="orders-hero-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 16h30l-2.5 25h-25L9 16Z"/><path d="M17 16v-5a7 7 0 0 1 14 0v5"/><path d="M17 25v.1M31 25v.1"/><path d="M17 32c2 2 4.3 3 7 3s5-1 7-3"/></svg></div><div><small>PUSAT BELANJA</small><h3>Pesanan Saya</h3><p>Pantau pesananmu sampai tiba di rumah</p></div><span class="orders-hero-spark">✦</span></div><div class="orders-search"><span>⌕</span><input id="orderSearch" placeholder="Cari pesanan Anda" oninput="filterOrderCards()"><b>☰</b></div>'+orderTabs(filter)+'<div id="orderCards">';
  if(filtered.length){html+=filtered.map(renderOrderCard).join('');}
  else{html+='<div class="order-empty"><div class="empty-icon">🎁</div><h3>Tidak ada pesanan terkait</h3><p>Lihat-lihat dan temukan produk DIMSUM yang kamu suka.</p><button onclick="closeSimple();goHome()">Belanja Sekarang</button></div><div class="suggested-title">Produk DIMSUM untukmu</div><div class="suggested-mini">'+products.slice(0,4).map(p=>'<div onclick="showProductDetail('+p.id+')"><div><img class="mini-product-photo" src="'+p.image+'" alt="'+p.name+'"></div><b>'+p.name+'</b><span>'+rupiah(p.price)+'</span></div>').join('')+'</div>';}
  html+='</div></div>';
  simple('Pesanan Saya',html,'orders');
}
function filterOrderCards(){const q=($('orderSearch')?.value||'').toLowerCase();document.querySelectorAll('#orderCards .order-card').forEach(c=>c.style.display=c.dataset.search.includes(q)?'block':'none')}
function showOrderDetail(id){
  const orders=readOrders();
  const o=orders.find(x=>String(x.id)===String(id));
  if(!o)return;
  const stages=[
    {key:'Dikemas',title:'Pesanan diproses',desc:'Pesanan disiapkan oleh penjual'},
    {key:'Dikirim',title:'Dalam perjalanan',desc:'Pesanan sedang diantar kurir'},
    {key:'Selesai',title:'Pesanan selesai',desc:'Pesanan telah sampai'}
  ];
  const cancelled=o.status==='Dibatalkan';
  const currentIndex=stages.findIndex(x=>x.key===o.status);
  const timeline=cancelled
    ? `<div class="order-timeline cancelled"><div class="timeline-node">×</div><div><b>Pesanan dibatalkan</b><p>${o.cancelledAt||'Pesanan ini tidak dilanjutkan'}</p></div></div>`
    : `<div class="order-timeline">${stages.map((stage,i)=>{
      const done=currentIndex>=i;
      const current=currentIndex===i;
      const date=stage.key==='Dikemas'?(o.createdAt||o.date||'Pesanan dibuat'):stage.key==='Dikirim'?(o.shippedAt||'Menunggu pengiriman'):(o.completedAt||'Menunggu pesanan tiba');
      return `<div class="order-timeline-step ${done?'done':''} ${current?'current':''}"><span class="timeline-node">${done?'✓':i+1}</span><div><b>${stage.title}</b><p>${stage.desc}</p><small>${date}</small></div></div>`;
    }).join('')}</div>`;
  const items=(Array.isArray(o.items)?o.items:[]).map(i=>{
    const product=products.find(x=>Number(x.id)===Number(i.id));
    if(!product)return '';
    return `<div class="order-item"><div class="order-thumb">${product.image?`<img class="product-photo" src="${product.image}" alt="${product.name}">`:''}</div><div><b>${product.name}</b><span>${Number(i.qty)||1} × ${rupiah(product.price)}</span></div></div>`;
  }).join('');
  const total=Number(o.total)||Number(o.subtotal)||0;
  const action=o.status==='Dikemas'?`<button class="order-detail-track" onclick="simulateShipping('${o.id}')">Simulasikan pengiriman</button>`:'';
  const html=`<div class="order-detail order-detail-premium">
    <div class="order-detail-summary"><span class="status-large status-${String(o.status||'Dikemas').toLowerCase().replace(/\s+/g,'-')}">${o.status||'Dikemas'}</span><p>Terima kasih sudah berbelanja di KEL 5.</p><div class="order-detail-number"><small>Nomor pesanan</small><b>${o.id}</b><small>${o.createdAt||o.date||''}</small></div></div>
    <section class="order-detail-section"><h3>Riwayat status</h3>${timeline}</section>
    <section class="order-detail-section"><h3>Informasi pengiriman</h3><div class="order-info-row"><span>Kurir</span><b>${o.shipping||'J&T Express'}</b></div><div class="order-info-row"><span>Estimasi</span><b>${o.shippingEstimate||'Estimasi 2–4 hari'}</b></div><div class="order-info-row"><span>Pembayaran</span><b>${o.payment||'Belum dipilih'}</b></div></section>
    <section class="order-detail-section"><h3>Produk pesanan</h3>${items||'<p>Rincian produk tidak tersedia.</p>'}</section>
    <section class="order-detail-section order-total-section"><div class="order-info-row"><span>Total pembayaran</span><b>${rupiah(total)}</b></div></section>${action}
  </div>`;
  simple('Detail Pesanan',html,'orders');
}
function cancelOrder(id){
  let orders=readOrders();
  const o=orders.find(x=>x.id===id);
  if(!o || !['Belum Bayar','Dikemas'].includes(o.status)) return;
  const ok=confirm('Batalkan pesanan '+o.id+'?\n\nPesanan yang sudah dibatalkan tidak dapat diproses kembali.');
  if(!ok) return;
  o.status='Dibatalkan';
  o.cancelledAt=new Date().toLocaleString('id-ID');
  localStorage.setItem('dinsumOrders',JSON.stringify(orders));
  showOrders('Dibatalkan');
}

function simulateShipping(id){let orders=readOrders(),o=orders.find(x=>x.id===id);if(!o)return;o.status='Dikirim';localStorage.setItem('dinsumOrders',JSON.stringify(orders));showOrders('Dikirim')}
function accountMenu(title,desc,onclick,icon){
const icons={
'Profil':'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="8"/><path d="M9 40c1-8 7-13 15-13s14 5 15 13"/></svg>',
'Alamat Pengiriman':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42s14-13 14-24a14 14 0 1 0-28 0c0 11 14 24 14 24Z"/><circle cx="24" cy="18" r="5"/></svg>',
'Metode Pembayaran':'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="38" height="28" rx="5"/><path d="M6 19h36M12 29h10"/><circle cx="35" cy="29" r="3"/></svg>',
'Jasa Pengiriman':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13h24v21H5zM29 20h8l6 8v6H29z"/><path d="M29 24h7l4 5H29"/><circle cx="13" cy="37" r="4"/><circle cx="36" cy="37" r="4"/></svg>',
'Voucher Saya':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 13a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v6a5 5 0 0 0 0 10v6a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4v-6a5 5 0 0 0 0-10z"/><path d="m18 31 12-14M18 18h.1M30 30h.1"/></svg>',
'Notifikasi':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 33h28l-4-6V19a10 10 0 0 0-20 0v8z"/><path d="M19 38a5 5 0 0 0 10 0"/></svg>',
'Password':'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="21" width="30" height="21" rx="4"/><path d="M15 21v-7a9 9 0 0 1 18 0v7M24 29v5"/></svg>',
'Langganan Promo':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 12h32v24H8z"/><path d="M8 18h32M16 8v8M32 8v8M16 27h6M27 27h5M16 32h16"/></svg>',
'Pusat Bantuan':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 26v-5a16 16 0 0 1 32 0v5"/><rect x="5" y="24" width="9" height="13" rx="4"/><rect x="34" y="24" width="9" height="13" rx="4"/><path d="M34 37c-2 4-6 5-11 5"/><circle cx="23" cy="42" r="2"/></svg>',
'Tentang DIMSUM':'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"/><path d="M20 19a4 4 0 1 1 7 3c-2 2-3 3-3 6M24 34h.1"/></svg>',
'Keluar':'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M21 8H11a3 3 0 0 0-3 3v26a3 3 0 0 0 3 3h10M28 16l9 8-9 8M17 24h20"/></svg>'
};
const svg=icons[title]||'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M24 21v12M24 15h.1"/></svg>';
return `<button class="account-menu" onclick="${onclick}"><span class="account-menu-icon ${title==='Pusat Bantuan'?'support-icon':''}">${svg}</span><span class="account-menu-copy"><b>${title}</b><small>${desc}</small></span><strong aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></strong></button>`
}
function profilePhoto(u){return u.photo?`<img src="${u.photo}" alt="Foto profil">`:`<span>${(u.name||'D').charAt(0).toUpperCase()}</span>`}
function orderStatusCount(status){const orders=readOrders();return orders.filter(o=>o.status===status).reduce((total,o)=>total+(o.items||[]).reduce((sum,i)=>sum+Number(i.qty||1),0),0)}
function orderBadge(status){const n=orderStatusCount(status);return n>0?`<em class="order-badge">${n>99?'99+':n}</em>`:''}
function showAccount(){setBottomNav('Account');let u=getUser();if(!u){simple('Akun Saya',`<div class="guest-account"><div class="guest-avatar">👤</div><h3>Masuk ke akun kamu</h3><p>Masuk atau daftar untuk mengatur profil, melihat pesanan, alamat, dan fitur akun lainnya.</p><div class="guest-account-actions"><button onclick="closeSimple();openAuth('login')">Masuk</button><button onclick="closeSimple();openAuth('register')">Daftar</button></div><div class="account-section"><button class="account-menu" onclick="closeSimple();goHome()"><span class="account-menu-icon">🛍️</span><span><b>Lihat Produk</b><small>Jelajahi produk DIMSUM tanpa login</small></span><strong aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></strong></button></div></div>`,'account');return}simple('Akun Saya',`<div class="account-page"><div class="account-banner"><div class="account-profile"><div class="profile-photo">${profilePhoto(u)}<label for="photoUpload" title="Ganti foto profil" aria-label="Ganti foto profil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.5-2h7l1.5 2h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"/><circle cx="12" cy="13" r="3.5"/></svg></label><input id="photoUpload" type="file" accept="image/*" onchange="changePhoto(event)"></div><div><h3>${u.name||'Pelanggan KEL 5'}</h3><p>@${u.username||''}</p><small>${u.email||'Email belum diatur'} · ${u.phone||'Nomor HP belum diatur'}</small></div><button class="edit-profile-top" onclick="editProfile()">Edit</button></div></div><div class="account-section order-shortcuts"><div class="account-section-head"><b>Pesanan Saya</b><button onclick="showOrders()">Lihat Semua ›</button></div><div class="shortcut-row"><button onclick="showOrders('Belum Bayar')"><span class="shortcut-icon pending"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg></span><b>Belum Bayar</b></button><button onclick="showOrders('Dikemas')"><span class="shortcut-icon packed"><svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>${orderBadge('Dikemas')}</span><b>Dikemas</b></button><button onclick="showOrders('Dikirim')"><span class="shortcut-icon shipped"><svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg></span><b>Dikirim</b></button><button onclick="showOrders('Selesai')"><span class="shortcut-icon done"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg></span><b>Selesai</b></button><button onclick="showOrders('Dibatalkan')"><span class="shortcut-icon cancelled"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg></span><b>Dibatalkan</b></button></div></div><div class="account-section">${accountMenu('Profil','Ubah nama, email, nomor HP, dan foto','editProfile()','👤')}${accountMenu('Alamat Pengiriman','Atur alamat untuk checkout','editAddress()','📍')}${accountMenu('Metode Pembayaran','Pilih bank, e-wallet, QRIS, atau COD','closeSimple();openPayment()','💳')}${accountMenu('Jasa Pengiriman','Pilih kurir untuk pesanan','closeSimple();openShipping()','🚚')}${accountMenu('Voucher Saya','Lihat promo untuk belanja','showVouchers()','🎟️')}${accountMenu('Pengaturan Bahasa','Pilih bahasa tampilan website','showLanguageSettings()','🌐')}${accountMenu('Notifikasi','Info pesanan dan aktivitas akun','showNotifications()','🔔')}${accountMenu('Password','Ganti password akun','editPassword()','🔒')}${accountMenu('Pusat Bantuan','Pertanyaan umum dan bantuan','showHelp()','❔')}${accountMenu('Tentang DIMSUM','Informasi toko','showAbout()','ℹ️')}${accountMenu('Keluar','Keluar dari akun ini','logout()','↪️')}</div></div>`,'account')}
function showLanguageSettings(){
 const current=localStorage.getItem('kel5Language')||'id';
 const langs=[['id','🇮🇩','Bahasa Indonesia','Indonesia'],['en','🇬🇧','English','English'],['ms','🇲🇾','Bahasa Melayu','Malaysia'],['ja','🇯🇵','日本語','Jepang'],['ko','🇰🇷','한국어','Korea'],['zh','🇨🇳','简体中文','Tiongkok'],['th','🇹🇭','ภาษาไทย','Thailand'],['vi','🇻🇳','Tiếng Việt','Vietnam']];
 simple('Pengaturan Bahasa',`<div class="language-settings"><div class="language-settings-hero"><span>🌐</span><div><b>Bahasa tampilan</b><p>Pilih bahasa untuk navigasi dan kolom pencarian.</p></div></div>${langs.map(([code,flag,name,region])=>`<label class="language-option"><input type="radio" name="siteLanguage" value="${code}" ${current===code?'checked':''}><span><b>${name}</b><small>${region}</small></span><em>${flag}</em></label>`).join('')}<button class="subscription-save" onclick="saveLanguageSettings()">Simpan Bahasa</button><p class="subscription-note">Navigasi dan kolom pencarian mengikuti pilihan. Konten produk dan sebagian halaman masih berbahasa Indonesia.</p></div>`,'language');
}
function saveLanguageSettings(){const choice=document.querySelector('input[name="siteLanguage"]:checked')?.value||'id';localStorage.setItem('kel5Language',choice);applySiteLanguage();simple('Pengaturan Bahasa',`<div class="subscription-result"><div class="subscription-result-icon">✓</div><h3>Bahasa berhasil disimpan</h3><p>Pilihan bahasa telah diterapkan pada navigasi dan kolom pencarian.</p><button onclick="closeSimple()">Selesai</button></div>`,'language');}
function applySiteLanguage(){const lang=localStorage.getItem('kel5Language')||'id';const labels={id:['Beranda','Live & Video','Pesanan','Akun','Cari produk, merek, dan promo...'],en:['Home','Live & Video','Orders','Account','Search products, brands, and promos...'],ms:['Utama','Live & Video','Pesanan','Akaun','Cari produk, jenama dan promosi...'],ja:['ホーム','ライブ・動画','注文','アカウント','商品・ブランド・セールを検索...'],ko:['홈','라이브·동영상','주문','계정','상품, 브랜드, 프로모션 검색...'],zh:['首页','直播与视频','订单','账户','搜索商品、品牌和促销...'],th:['หน้าแรก','ไลฟ์และวิดีโอ','คำสั่งซื้อ','บัญชี','ค้นหาสินค้า แบรนด์ และโปรโมชัน...'],vi:['Trang chủ','Live & Video','Đơn hàng','Tài khoản','Tìm sản phẩm, thương hiệu và ưu đãi...']};const v=labels[lang]||labels.id;['navHome','navLive','navOrders','navAccount'].forEach((id,i)=>{const el=document.querySelector(`#${id} small`);if(el)el.textContent=v[i]});const search=document.getElementById('marketSearch');if(search)search.placeholder=v[4];}
function showPromoSubscription(){
 const u=getUser()||{}; const key='dinsumPromoSubscription'; const saved=JSON.parse(localStorage.getItem(key)||'{}');
 simple('Langganan Promo',`<div class="promo-subscription"><div class="subscription-hero"><span class="subscription-badge">KEL 5 MEMBER</span><div class="subscription-art">✦</div><h3>Belanja rutin, makin banyak keuntungan</h3><p>Program untuk pelanggan yang sering membeli dimsum. Aktifkan agar mudah melihat penawaran khusus anggota, voucher pelanggan, dan promo pembelian berikutnya.</p></div><div class="subscription-perks"><div><b>🎟️</b><span><strong>Voucher pelanggan</strong><small>Info voucher khusus anggota saat tersedia</small></span></div><div><b>✦</b><span><strong>Harga anggota</strong><small>Penawaran spesial untuk pelanggan rutin</small></span></div><div><b>🛍️</b><span><strong>Promo pembelian berikutnya</strong><small>Temukan penawaran untuk pesanan selanjutnya</small></span></div></div><label class="subscription-toggle"><input id="promoSubscriptionToggle" type="checkbox" ${saved.enabled?'checked':''}><span><b>Aktifkan langganan promo</b><small>Untuk pelanggan yang sering belanja · tersimpan di browser ini</small></span></label><button class="subscription-save" onclick="savePromoSubscription()">${saved.enabled?'Simpan Preferensi':'Aktifkan Langganan'}</button><p class="subscription-note">Fitur ini merupakan simulasi untuk proyek website. Belum mengirim email atau notifikasi sungguhan.</p></div>`,'subscription');
}
function savePromoSubscription(){const enabled=!!document.getElementById('promoSubscriptionToggle')?.checked;localStorage.setItem('dinsumPromoSubscription',JSON.stringify({enabled,updatedAt:new Date().toISOString()}));simple('Langganan Promo',`<div class="subscription-result"><div class="subscription-result-icon">${enabled?'✓':'🔕'}</div><h3>${enabled?'Langganan promo aktif':'Langganan promo dinonaktifkan'}</h3><p>${enabled?'Preferensi promo dan harga spesial berhasil disimpan di browser ini.':'Kamu bisa mengaktifkannya kembali kapan saja dari menu Akun.'}</p><button onclick="showAccount()">Kembali ke Akun</button></div>`,'subscription');}
let photoCropState=null;
function changePhoto(event){
 const file=event.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){alert('Pilih file gambar seperti JPG, PNG, atau WEBP.');return}
 const reader=new FileReader();reader.onerror=()=>alert('Foto tidak bisa dibaca. Coba pilih gambar lain.');
 reader.onload=()=>{const img=new Image();img.onerror=()=>alert('Format foto ini belum didukung. Coba JPG, PNG, atau WEBP.');img.onload=()=>{
   photoCropState={img,zoom:1,x:0,y:0,dragging:false,startX:0,startY:0,baseX:0,baseY:0};
   showPhotoCrop();
 };img.src=reader.result};reader.readAsDataURL(file);event.target.value='';
}
function showPhotoCrop(){
 simple('Sesuaikan Foto Profil',`<div class="photo-crop-tool"><p>Geser foto untuk mengatur posisi, lalu gunakan zoom jika perlu.</p><div class="photo-crop-window" id="photoCropWindow"><img id="photoCropImage" alt="Pratinjau pemotongan foto" draggable="false"></div><label for="photoCropZoom">Perbesar foto</label><input id="photoCropZoom" type="range" min="1" max="3" step="0.01" value="1" oninput="updatePhotoCropZoom(this.value)"><div class="photo-crop-actions"><button class="photo-crop-cancel" onclick="cancelPhotoCrop()">Batal</button><button class="photo-crop-save" onclick="savePhotoCrop()">Gunakan Foto</button></div></div>`,'photo-crop');
 const img=document.getElementById('photoCropImage');img.src=photoCropState.img.src;img.onload=()=>renderPhotoCrop();
 const area=document.getElementById('photoCropWindow');area.addEventListener('pointerdown',photoCropPointerDown);area.addEventListener('pointermove',photoCropPointerMove);area.addEventListener('pointerup',photoCropPointerUp);area.addEventListener('pointercancel',photoCropPointerUp);area.addEventListener('pointerleave',photoCropPointerUp);
}
function renderPhotoCrop(){const s=photoCropState;if(!s)return;const area=document.getElementById('photoCropWindow'),img=document.getElementById('photoCropImage');if(!area||!img)return;const size=area.clientWidth,scale=Math.max(size/s.img.naturalWidth,size/s.img.naturalHeight)*s.zoom;img.style.width=(s.img.naturalWidth*scale)+'px';img.style.height=(s.img.naturalHeight*scale)+'px';img.style.left=`calc(50% + ${s.x}px)`;img.style.top=`calc(50% + ${s.y}px)`;img.style.transform='translate(-50%,-50%)';}
function updatePhotoCropZoom(value){if(!photoCropState)return;photoCropState.zoom=Number(value)||1;renderPhotoCrop()}
function photoCropPointerDown(e){if(!photoCropState)return;const s=photoCropState;s.dragging=true;s.startX=e.clientX;s.startY=e.clientY;s.baseX=s.x;s.baseY=s.y;e.currentTarget.setPointerCapture?.(e.pointerId)}
function photoCropPointerMove(e){const s=photoCropState;if(!s?.dragging)return;s.x=s.baseX+e.clientX-s.startX;s.y=s.baseY+e.clientY-s.startY;renderPhotoCrop()}
function photoCropPointerUp(){if(photoCropState)photoCropState.dragging=false}
function cancelPhotoCrop(){photoCropState=null;showAccount()}
function savePhotoCrop(){const s=photoCropState;if(!s)return;try{const area=document.getElementById('photoCropWindow'),size=area.clientWidth,scale=Math.max(size/s.img.naturalWidth,size/s.img.naturalHeight)*s.zoom;const cropX=(s.img.naturalWidth/2)-(size/2+s.x)/scale;const cropY=(s.img.naturalHeight/2)-(size/2+s.y)/scale;const cropSize=size/scale;const x=Math.max(0,Math.min(s.img.naturalWidth-cropSize,cropX));const y=Math.max(0,Math.min(s.img.naturalHeight-cropSize,cropY));const actualSize=Math.min(cropSize,s.img.naturalWidth-x,s.img.naturalHeight-y);const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const ctx=canvas.getContext('2d');ctx.drawImage(s.img,x,y,actualSize,actualSize,0,0,600,600);const u=getUser()||{};u.photo=canvas.toDataURL('image/jpeg',0.88);delete u.photoZoom;saveUser(u);photoCropState=null;showAccount()}catch(e){alert('Foto tidak bisa diproses. Coba pilih gambar lain.')}}
function editProfile(){let u=getUser()||{};simple('Edit Profil',`<div class="account-form"><label>Foto Profil</label><p style="font-size:12px;color:#777">Gunakan ikon kamera di foto profil untuk mengganti foto.</p><label>Username</label><input value="${u.username||''}" disabled><label>Nama Lengkap</label><input id="profileName" value="${u.name||''}"><label>Email</label><input id="profileEmail" type="email" value="${u.email||''}"><label>Nomor HP</label><input id="profilePhone" value="${u.phone||''}" placeholder="08xxxxxxxxxx"><button onclick="saveProfile()">Simpan Perubahan</button></div>`)}
function saveProfile(){let u=getUser()||{};u.name=$('profileName').value.trim()||u.name;u.email=$('profileEmail').value.trim().toLowerCase();u.phone=$('profilePhone').value.trim();saveUser(u);showAccount()}
const regionCache = {};
const fallbackRegions = {
  provinces: [{id:'61',name:'Kalimantan Barat'}],
  regencies: {
    '61': [
      {id:'6171',name:'Kota Pontianak'},{id:'6172',name:'Kota Singkawang'},
      {id:'6101',name:'Kabupaten Sambas'},{id:'6102',name:'Kabupaten Bengkayang'},
      {id:'6103',name:'Kabupaten Landak'},{id:'6104',name:'Kabupaten Mempawah'},
      {id:'6105',name:'Kabupaten Sanggau'},{id:'6106',name:'Kabupaten Ketapang'},
      {id:'6107',name:'Kabupaten Sintang'},{id:'6108',name:'Kabupaten Kapuas Hulu'},
      {id:'6109',name:'Kabupaten Sekadau'},{id:'6110',name:'Kabupaten Melawi'},
      {id:'6111',name:'Kabupaten Kayong Utara'},{id:'6112',name:'Kabupaten Kubu Raya'}
    ]
  },
  districts: {
    '6171': ['Pontianak Kota','Pontianak Selatan','Pontianak Tenggara','Pontianak Timur','Pontianak Barat','Pontianak Utara'].map((name,i)=>({id:'6171'+String(i+1).padStart(3,'0'),name})),
    '6172': ['Singkawang Barat','Singkawang Timur','Singkawang Utara','Singkawang Selatan','Singkawang Tengah'].map((name,i)=>({id:'6172'+String(i+1).padStart(3,'0'),name})),
    '6112': ['Sungai Raya','Sungai Ambawang','Kuala Mandor B','Rasau Jaya','Kubu','Teluk Pakedai','Terentang','Batu Ampar','Kakap','Sungai Kakap','Kubu'].map((name,i)=>({id:'6112'+String(i+1).padStart(3,'0'),name}))
  },
  villages: {}
};
async function loadRegions(kind,parentId=''){
  const key=kind+':'+parentId;if(regionCache[key])return regionCache[key];
  const endpoint={provinces:'provinces.json',regencies:`regencies/${parentId}.json`,districts:`districts/${parentId}.json`,villages:`villages/${parentId}.json`};
  try{
    const response=await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/'+endpoint[kind],{cache:'force-cache'});
    if(!response.ok)throw new Error('Wilayah tidak tersedia');
    const data=await response.json();regionCache[key]=data;return data;
  }catch(e){
    let data=[];
    if(kind==='provinces')data=fallbackRegions.provinces;
    else data=(fallbackRegions[kind]||{})[parentId]||[];
    regionCache[key]=data;return data;
  }
}
function fillRegionSelect(id,items,placeholder,selected=''){
  const el=$(id);if(!el)return;el.innerHTML='';const first=document.createElement('option');first.value='';first.textContent=placeholder;el.appendChild(first);
  items.forEach(item=>{const opt=document.createElement('option');opt.value=String(item.id);opt.textContent=item.name;el.appendChild(opt)});
  if(selected&&items.some(item=>String(item.id)===String(selected)))el.value=String(selected);
  el.disabled=!items.length;
}
async function initAddressForm(data={}){
  const province= $('addressProvince'), regency=$('addressRegency'), district=$('addressDistrict'), village=$('addressVillage');
  const provinces=await loadRegions('provinces');fillRegionSelect('addressProvince',provinces,'Pilih provinsi',data.provinceId||'61');
  async function updateRegencies(selected=''){
    fillRegionSelect('addressRegency',[],'Memuat kabupaten/kota…');fillRegionSelect('addressDistrict',[],'Pilih kecamatan');fillRegionSelect('addressVillage',[],'Pilih kelurahan/desa');
    const list=await loadRegions('regencies',province.value);fillRegionSelect('addressRegency',list,'Pilih kabupaten/kota',selected);
    if(regency.value)await updateDistricts(data.districtId||'');
  }
  async function updateDistricts(selected=''){
    fillRegionSelect('addressDistrict',[],'Memuat kecamatan…');fillRegionSelect('addressVillage',[],'Pilih kelurahan/desa');
    const list=await loadRegions('districts',regency.value);fillRegionSelect('addressDistrict',list,'Pilih kecamatan',selected);
    if(district.value)await updateVillages(data.villageId||'');
  }
  async function updateVillages(selected=''){
    fillRegionSelect('addressVillage',[],'Memuat kelurahan/desa…');
    const list=await loadRegions('villages',district.value);fillRegionSelect('addressVillage',list,'Pilih kelurahan/desa',selected);
  }
  province.onchange=()=>{data={};updateRegencies()};
  regency.onchange=()=>{data={};updateDistricts()};
  district.onchange=()=>{data={};updateVillages()};
  await updateRegencies(data.regencyId||'6171');
  if(data.districtId && district.value!==String(data.districtId)) await updateDistricts(data.districtId);
  if(data.villageId && village.value!==String(data.villageId)) await updateVillages(data.villageId);
}
function openCheckoutAddressEditor(){
  addressEditorFromCheckout=true;
  editAddress();
}
function openAccountAddressSettings(){
  // Panah di checkout membawa pengguna ke menu Akun > Alamat Pengiriman.
  addressEditorFromCheckout=false;
  closeCheckout();
  showAccount();
  window.setTimeout(()=>editAddress(),0);
}
function editAddress(){
  let u=getUser()||{},d=u.addressData||{};
  simple('Alamat Pengiriman',`<div class="account-form address-form">
    <div class="address-form-intro"><span>📍</span><div><b>Atur alamat tujuan</b><small>Pilih wilayah secara berurutan agar daftar berikutnya menyesuaikan.</small></div></div>
    <label>Label Alamat</label><select id="addressLabel"><option value="Rumah">🏠 Rumah</option><option value="Kantor">🏢 Kantor</option><option value="Kos">🛏️ Kos</option></select>
    <label>Nama Penerima</label><input id="addressReceiver" value="${(d.receiver||u.name||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}" placeholder="Nama penerima">
    <label>Nomor HP Penerima</label><input id="addressPhone" type="tel" value="${(d.phone||u.phone||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}" placeholder="08xxxxxxxxxx">
    <label>Provinsi</label><select id="addressProvince"><option value="">Memuat provinsi…</option></select>
    <label>Kabupaten/Kota</label><select id="addressRegency" disabled><option value="">Pilih kabupaten/kota</option></select>
    <label>Kecamatan</label><select id="addressDistrict" disabled><option value="">Pilih kecamatan</option></select>
    <label>Kelurahan/Desa</label><select id="addressVillage" disabled><option value="">Pilih kelurahan/desa</option></select><input id="addressVillageOther" value="${(d.villageId?'':(d.village||'')).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="Isi manual jika nama tidak tersedia">
    <label>Kode Pos</label><input id="addressPostal" inputmode="numeric" maxlength="5" value="${d.postalCode||''}" placeholder="Contoh: 78121">
    <label>Nama Jalan, nomor rumah, RT/RW, patokan</label><textarea id="addressStreet" rows="3" placeholder="Masukkan detail alamat lengkap">${(d.street||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    <p id="addressMessage" class="form-msg"></p><button onclick="saveAddress()">Simpan Alamat</button>
    <small class="address-note">Daftar wilayah diambil dari data wilayah Indonesia saat internet tersedia. Jika offline, pilihan cadangan Kalimantan Barat digunakan.</small>
  </div>`,'account');
  if(d.label)$('addressLabel').value=d.label;
  initAddressForm(d);
}
function saveAddress(){
  let u=getUser()||{},ids=['addressProvince','addressRegency','addressDistrict','addressVillage'];
  for(const id of ids){if(!$(id)?.value){$('addressMessage').textContent='Lengkapi provinsi, kabupaten/kota, kecamatan, dan kelurahan/desa terlebih dahulu.';return}}
  const val=id=>$(id).selectedOptions[0]?.textContent||'';
  const villageManual=$('addressVillageOther').value.trim();
  const d={label:$('addressLabel').value,receiver:$('addressReceiver').value.trim(),phone:$('addressPhone').value.trim(),provinceId:$('addressProvince').value,province:val('addressProvince'),regencyId:$('addressRegency').value,regency:val('addressRegency'),districtId:$('addressDistrict').value,district:val('addressDistrict'),villageId:villageManual?'':$('addressVillage').value,village:villageManual||val('addressVillage'),postalCode:$('addressPostal').value.trim(),street:$('addressStreet').value.trim()};
  if(!d.receiver||!d.phone||!d.street||!d.village){$('addressMessage').textContent='Nama penerima, nomor HP, kelurahan/desa, dan detail alamat wajib diisi.';return}
  u.addressData=d;u.phone=d.phone;u.address=[d.street,`Kel. ${d.village}`,`Kec. ${d.district}`,d.regency,d.province,d.postalCode].filter(Boolean).join(', ');saveUser(u);if(addressEditorFromCheckout){addressEditorFromCheckout=false;if($('checkoutName'))$('checkoutName').textContent=d.receiver||u.name||'Pelanggan';if($('checkoutAddress'))$('checkoutAddress').textContent=u.address;closeSimple();const overlay=$('checkoutOverlay');if(overlay){overlay.classList.add('show');overlay.style.display='block'}return}showAccount();
}
function editPassword(){simple('Ganti Password',`<div class="account-form"><label>Password Lama</label><input id="oldPass" type="password"><label>Password Baru</label><input id="newPass" type="password"><label>Konfirmasi Password Baru</label><input id="newPass2" type="password"><p id="passMsg" class="form-msg"></p><button onclick="savePassword()">Simpan Password</button></div>`)}
function savePassword(){let u=getUser()||{},old=$('oldPass').value,n=$('newPass').value,n2=$('newPass2').value,msg=$('passMsg');if(old!==u.password)return msg.textContent='Password lama salah.';if(n.length<6)return msg.textContent='Password baru minimal 6 karakter.';if(n!==n2)return msg.textContent='Konfirmasi password tidak sama.';u.password=n;saveUser(u);showAccount()}
function showVouchers(){simple('Voucher Saya',`<div class="account-info-page my-vouchers-page"><div class="my-voucher-head"><span class="voucher-brand-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 13a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v6a5 5 0 0 0 0 10v6a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4v-6a5 5 0 0 0 0-10z"/><path d="m18 31 12-14M18 18h.1M30 30h.1"/></svg></span><div><b>Voucher KEL 5</b><p>Klaim promo dan hemat belanja dimsum kamu.</p></div></div><div class="my-voucher-list"><div class="my-voucher-item"><span class="voucher-modal-icon shipping">🚚</span><div><b>Gratis Ongkir</b><small>Hemat ongkir hingga Rp12.000</small><em>Min. belanja Rp20.000</em></div><button onclick="closeSimple();openCheckout()">Pakai</button></div><div class="my-voucher-item"><span class="voucher-modal-icon discount">％</span><div><b>Diskon 10%</b><small>Potongan maksimal Rp15.000</small><em>Promo belanja</em></div><button onclick="closeSimple();openCheckout()">Pakai</button></div><div class="my-voucher-item"><span class="voucher-modal-icon discount">−</span><div><b>Potongan Rp5.000</b><small>Untuk belanja minimal Rp50.000</small><em>Promo pilihan KEL 5</em></div><button onclick="closeSimple();openCheckout()">Pakai</button></div><div class="my-voucher-item"><span class="voucher-modal-icon combo">✦</span><div><b>Promo Hemat Kombo</b><small>Diskon 5% + gratis ongkir</small><em>Promo spesial</em></div><button onclick="closeSimple();openCheckout()">Pakai</button></div></div><div class="account-info-card"><b>Tips hemat belanja</b><p>Pilih voucher yang sesuai saat checkout. Satu voucher dapat digunakan untuk satu pesanan.</p></div></div>`)}
function showNotifications(){
  const notifications=JSON.parse(localStorage.getItem('dinsumNotifications')||'[]');
  const orders=readOrders();
  const fromOrders=orders.map(o=>({id:'order-'+o.id,orderId:o.id,title:'Pembaruan pesanan',message:'Status pesanan '+o.id+' sekarang: '+(o.status==='Dikemas'?'Sedang Dikemas':o.status||'Diproses')+'.',status:o.status,date:o.createdAt||o.date||'Aktivitas pesanan',read:false}));
  const all=[...notifications,...fromOrders].sort((a,b)=>String(b.id).localeCompare(String(a.id))).slice(0,20);
  const content=all.length?all.map(n=>`<div class="account-info-card notification-card"><div class="notification-symbol">${n.status==='Dikemas'?'📦':'🔔'}</div><div class="notification-copy"><b>${n.title||'Pembaruan pesanan'}</b><p>${n.message||('Status pesanan '+n.orderId+': '+n.status)}</p><small>${n.date||'Aktivitas pesanan'}${n.orderId?' · No. '+n.orderId:''}</small></div><strong class="notification-status">${n.status==='Dikemas'?'Sedang Dikemas':(n.status||'Info')}</strong></div>`).join(''):`<div class="account-info-empty"><div>🔔</div><b>Belum ada notifikasi</b><p>Info pesanan dan aktivitas akun akan muncul di sini setelah kamu membuat pesanan.</p></div>`;
  simple('Notifikasi',`<div class="account-info-page">${content}</div>`);
}
function showAbout(){simple('Tentang DIMSUM',`<div class="account-info-page"><div class="account-info-card about-info"><div class="about-logo">🥟</div><h3>DIMSUM · KEL 5</h3><p>Toko online dimsum untuk proyek e-commerce mahasiswa. Jelajahi menu, masukkan produk ke keranjang, lalu lanjutkan ke checkout.</p><small>Demo toko online untuk tugas perkuliahan.</small></div></div>`)}
function showHelp(){simple('Pusat Bantuan',`<div class="account-info-page"><div class="help-hero"><div class="help-agent-art"><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="45" fill="#fff0e8"/><path d="M23 48v-7a25 25 0 0 1 50 0v7" fill="none" stroke="#ee4d2d" stroke-width="7" stroke-linecap="round"/><rect x="17" y="45" width="15" height="24" rx="7" fill="#ee4d2d"/><rect x="64" y="45" width="15" height="24" rx="7" fill="#ee4d2d"/><path d="M65 70c-4 8-12 11-22 11" fill="none" stroke="#ee4d2d" stroke-width="5" stroke-linecap="round"/><circle cx="42" cy="81" r="4" fill="#ee4d2d"/></svg></div><div><b>Hai, ada yang bisa kami bantu?</b><p>Temukan jawaban seputar pesanan, pembayaran, dan pengiriman.</p><span class="help-status"><i></i> Pusat bantuan KEL 5</span></div></div><div class="account-info-card"><b>Bagaimana cara memesan?</b><p>Pilih produk di Beranda, masukkan ke keranjang, lalu tekan Checkout.</p></div><div class="account-info-card"><b>Bagaimana mengubah alamat?</b><p>Buka Akun Saya → Alamat Pengiriman, ubah alamat, lalu simpan.</p></div><div class="account-info-card"><b>Bagaimana melihat status pesanan?</b><p>Buka Akun Saya → Pesanan Saya atau pilih menu Pesanan di navigasi bawah.</p></div><div class="account-info-card"><b>Catatan</b><p>Ini adalah pusat bantuan demo untuk proyek KEL 5, bukan layanan pelanggan aktif.</p></div></div>`)}
function goHome(){closeSimple();closeCart();document.querySelector('.topbar')?.classList.remove('home-hidden');setBottomNav('Home');window.scrollTo({top:0,behavior:'smooth'});}
function scrollProducts(){$('produk').scrollIntoView({behavior:'smooth'})}
updateAuthUI();showStore();renderUserUI();


// V28: ESC always closes camera/recording view
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('liveStage')?.classList.contains('hidden'))stopRealLive();if(!$('recordStage')?.classList.contains('hidden'))closeRecordVideo();}});


/* Quantity buttons use direct inline handlers so clicks work reliably after checkout rerenders. */

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('purchaseOverlay')?.classList.contains('show'))closePurchaseOptions()});
