import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.client = None
        self.key_id = os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        
        if self.key_id and self.key_secret:
            try:
                import razorpay
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
                logger.info("Razorpay payment client initialized successfully.")
            except Exception as e:
                logger.warning(f"Error initializing Razorpay billing client: {e}")
        else:
            logger.info("Razorpay credentials missing. Payment engine running in sandbox mock mode.")

    def create_subscription_order(self, tenant_id: str, plan_name: str, amount_in_rupees: float) -> Dict[str, Any]:
        """
        Creates a payment order for a tenant checkout flow.
        """
        amount_paise = int(amount_in_rupees * 100) # Razorpay works in paise
        
        if self.client:
            try:
                order_data = {
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"receipt_tenant_{tenant_id}",
                    "notes": {
                        "tenant_id": tenant_id,
                        "plan": plan_name
                    }
                }
                order = self.client.order.create(data=order_data)
                return {
                    "order_id": order["id"],
                    "amount": order["amount"],
                    "currency": order["currency"],
                    "status": "created"
                }
            except Exception as e:
                logger.error(f"Razorpay order creation failed: {e}")
                raise Exception(f"Payment gateway error: {e}")

        # Local Sandboxed Mock Output
        logger.info(f"Sandbox Order: Created billing session for Tenant {tenant_id} [{plan_name} plan] for INR {amount_in_rupees}")
        return {
            "order_id": f"order_mock_{tenant_id[:8]}",
            "amount": amount_paise,
            "currency": "INR",
            "status": "created",
            "mock": True
        }

    def verify_payment_signature(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """
        Verifies the signature authenticity sent from Razorpay webhooks or client dashboards.
        """
        if self.client:
            try:
                params_dict = {
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                }
                self.client.utility.verify_payment_signature(params_dict)
                return True
            except Exception as e:
                logger.error(f"Razorpay verification failed: {e}")
                return False
        
        # In sandbox dev mode, assume mock signatures starting with 'valid_' are successful
        return razorpay_signature.startswith("valid_")

# Global Singleton Instance
payment_service = PaymentService()
