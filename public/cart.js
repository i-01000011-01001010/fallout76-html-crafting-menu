const CART_KEY = "fo76camp_request_cart";

function cartLoad() {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cartSave(list) {
  try { sessionStorage.setItem(CART_KEY, JSON.stringify(list)); } catch { /* storage unavailable, ignore */ }
}

function cartAdd(item) {
  const list = cartLoad();
  if (!list.some(i => i.id === item.id)) {
    list.push({ id: item.id, name: item.name });
    cartSave(list);
  }
  return list;
}

function cartRemove(id) {
  const list = cartLoad().filter(i => i.id !== id);
  cartSave(list);
  return list;
}

function cartClear() {
  cartSave([]);
}

function cartIds() {
  return new Set(cartLoad().map(i => i.id));
}
