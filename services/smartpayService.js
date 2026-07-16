const axios = require('axios');

const SMARTPAY_CONFIG = {
  apiKey: "82e9d52e0c27b2dedc2622fc9098026deabdb3bd5259e985c306ed92862cfcce",
  baseURL: "https://api.smartpaypesa.com/v1",
  destination: {
    method: "phone",
    phone: "254140834185"
  }
};

class SmartPayService {
  constructor() {
    this.apiKey = SMARTPAY_CONFIG.apiKey;
    this.baseURL = SMARTPAY_CONFIG.baseURL;
    this.pushUrl = `${this.baseURL}/stk/push`;
    this.statusUrl = `${this.baseURL}/transactions`;
  }

  async initiatePayment(phone, amount, reference, description) {
    try {
      const response = await axios.post(
        this.pushUrl,
        {
          phone,
          amount: amount.toString(),
          account_reference: reference,
          description: description || 'Payment Activation'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data || {};
      const success = data.success === true || data.success === 'true' || data.success === 1;
      const checkoutRequestId = data.checkout_request_id;

      if (success || checkoutRequestId) {
        return {
          success: true,
          checkoutRequestId,
          merchantRequestId: data.merchant_request_id,
          message: data.message || 'STK Push initiated successfully'
        };
      }

      const msg = data.message || data.error || data.detail || 'Payment initiation failed';
      console.error('SmartPay initiate rejected:', data);
      const err = new Error(msg);
      err.status = 400;
      err.raw = data;
      throw err;
    } catch (error) {
      const data = error.response?.data || {};
      const checkoutRequestId = data.checkout_request_id;

      if (checkoutRequestId) {
        return {
          success: true,
          checkoutRequestId,
          merchantRequestId: data.merchant_request_id,
          message: data.message || 'STK Push initiated successfully'
        };
      }

      console.error('SmartPay initiate error:', error.response?.data || error.message);
      const raw = error.response?.data || error.message || 'Payment initiation failed';
      const msg = typeof raw === 'string' ? raw : (raw.message || raw.error || raw.detail || 'Payment initiation failed');
      const err = new Error(msg);
      err.status = error.response?.status;
      err.raw = raw;
      throw err;
    }
  }

  async checkPaymentStatus(checkoutRequestId) {
    try {
      const response = await axios.get(
        `${this.statusUrl}/${checkoutRequestId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const data = response.data || {};
      return {
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        status: data.TransactionStatus,
        amount: data.TransactionAmount,
        msisdn: data.Msisdn
      };
    } catch (error) {
      console.error('SmartPay status check error:', error.response?.data || error.message);
      throw error;
    }
  }

  async waitForPaymentCompletion(checkoutRequestId, timeout = 60000) {
    const startTime = Date.now();
    const pollInterval = 3000;

    while (Date.now() - startTime < timeout) {
      const status = await this.checkPaymentStatus(checkoutRequestId);

      if (status.status === 'Completed') {
        return { success: true, status };
      }

      if (status.status === 'Failed') {
        return { success: false, status, error: 'Payment failed' };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return { success: false, error: 'Payment timeout' };
  }
}

module.exports = SmartPayService;
