import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

const CHECKOUT_KEY = "checkout_data";

async function initRazorpayFlow() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = "/login.html?redirect=/payment.html";
        return;
    }

    const rawData = localStorage.getItem(CHECKOUT_KEY);
    if (!rawData) {
        window.location.href = "/cart.html";
        return;
    }

    const checkout = safeJSONParse(rawData, null);
    if (!checkout || !checkout.address) {
        window.location.href = "/checkout.html";
        return;
    }

    // Update UI
    document.getElementById("amount-val").innerText = Number(checkout.total_price || 0).toLocaleString();
    document.getElementById("shipping-name").innerText = checkout.address.name;
    document.getElementById("shipping-address").innerText = `${checkout.address.address}, ${checkout.address.city}, ${checkout.address.state} - ${checkout.address.pincode}`;

    const payBtn = document.getElementById("pay-btn");
    payBtn.addEventListener("click", () => handlePayment(checkout));
}

async function handlePayment(checkout) {
    const btn = document.getElementById("pay-btn");
    const span = btn.querySelector("span");
    const icon = btn.querySelector("i");
    
    btn.disabled = true;
    span.innerText = "Initializing...";
    icon.className = "fas fa-spinner fa-spin text-xs";

    try {
        const isBuyNow = checkout.type === 'buy_now';
        const commonPayload = {
            full_name: checkout.address.name,
            phone: checkout.address.phone,
            pincode: checkout.address.pincode,
            address: checkout.address.address,
            city: checkout.address.city,
            state: checkout.address.state,
            payment_method: "cod",
        };

        let endpoint = "/checkout/cart";
        let payload = { ...commonPayload };

        if (isBuyNow && checkout.items && checkout.items.length > 0) {
            endpoint = "/checkout/single";
            payload.product_id = checkout.items[0].product_id || checkout.items[0].id;
            payload.quantity = checkout.items[0].quantity || 1;
        } else {
            payload.items = (checkout.items || []).map(it => ({
                product_id: it.product_id || it.id,
                quantity: it.quantity || it.qty || 1
            }));
        }

        // 1. Create Local Order
        const localResp = await apiCall(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
            requireAuth: true,
        });

        if (!localResp || (!localResp.order && !localResp.success)) {
            throw new Error(localResp?.message || "Failed to create local order");
        }

        const orderId = localResp.order?.order_number || localResp.order?.id || localResp.data?.id;

        // 2. Create Razorpay Order
        span.innerText = "Securing Gateway...";
        const rzpData = await apiCall("/razorpay/order", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId }),
            requireAuth: true
        });

        if (!rzpData || !rzpData.order_id) {
            throw new Error(rzpData?.message || "Gateway initialization failed");
        }

        // 3. Open Razorpay Modal
        const options = {
            key: rzpData.key,
            amount: rzpData.amount,
            currency: rzpData.currency || "INR",
            name: "SoloCart",
            description: `Order #${orderId}`,
            order_id: rzpData.order_id,
            handler: async function (response) {
                span.innerText = "Verifying...";
                
                const verify = await apiCall("/razorpay/verify", {
                    method: "POST",
                    body: JSON.stringify({
                        local_order_id: orderId,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    }),
                    requireAuth: true
                });

                if (verify.status === "success" || verify.success) {
                    if (window.showToast) window.showToast("Payment Successful!");
                    
                    // Cleanup
                    localStorage.removeItem(CHECKOUT_KEY);
                    localStorage.removeItem("buy_now_item");
                    localStorage.removeItem("checkout_type");

                    setTimeout(() => {
                        window.location.href = `/checkout-success.html?order_id=${orderId}`;
                    }, 1000);
                } else {
                    throw new Error(verify.message || "Verification failed");
                }
            },
            prefill: {
                name: checkout.address.name,
                contact: checkout.address.phone,
                email: checkout.address.email || ""
            },
            theme: { color: "#4f46e5" },
            modal: {
                ondismiss: function() {
                    resetBtn();
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error("[Razorpay] Error:", err);
        if (window.showToast) window.showToast(err.message, "error");
        else alert(err.message);
        resetBtn();
    }
}

function resetBtn() {
    const btn = document.getElementById("pay-btn");
    const span = btn.querySelector("span");
    const icon = btn.querySelector("i");
    btn.disabled = false;
    span.innerText = "Pay Now";
    icon.className = "fa-solid fa-arrow-right text-xs";
}

// Toast helper if not present
if (!window.showToast) {
    window.showToast = function(msg, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        const div = document.createElement("div");
        div.className = `px-6 py-4 rounded-2xl shadow-xl text-white font-bold text-sm transform transition-all animate-bounce ${type === 'error' ? 'bg-rose-500' : 'bg-slate-900'}`;
        div.innerText = msg;
        container.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 500);
        }, 3000);
    }
}

document.addEventListener("DOMContentLoaded", initRazorpayFlow);
