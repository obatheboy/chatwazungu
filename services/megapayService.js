const axios = require('axios');

const generateShortReference = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).slice(-6);
  const random = Math.random().toString(36).slice(-4);
  return `${prefix}_${timestamp}${random}`.slice(0, 20);
};

class MegaPayService {
  constructor() {
    this.apiKey = 'MGPYiOpqHhL6';
    this.email = 'obavanteshia65@gmail.com';
    this.shortcode = 'SURVO';
    this.initiateUrl = 'https://api.megapay.co.ke/backend/v1/initiatestk';
    this.statusUrl = 'https://api.megapay.co.ke/backend/v1/transactionstatus';
  }

  async initiatePayment(phone, amount, reference) {
    try {
      const response = await axios.post(this.initiateUrl, {
        api_key: this.apiKey,
        email: this.email,
        account_name: this.shortcode,
        amount: amount.toString(),
        msisdn: phone,
        reference: reference
      });

      const data = response.data || {};
      const success = data.success === '200' || data.success === 200 || data.status === 'success' || data.status === 200;
      const resultCode = data.ResultCode || data.ResponseCode || data.result_code || data.response_code;
      const isSuccess = success || resultCode == 0 || resultCode === '0';
      const isPinPrompt = data.message && data.message.toLowerCase().includes('enter your mpesa pin');

      if (isSuccess || isPinPrompt) {
        return {
          success: true,
          transactionRequestId: data.transaction_request_id || data.transactionRequestId || data.transaction_request_id,
          message: data.message || data.msg || data.errorMessage || 'Payment initiated successfully'
        };
      }

      const msg = data.message || data.msg || data.error || data.errorMessage || 'Payment initiation failed';
      console.error('MegaPay initiate rejected:', data);
      const err = new Error(msg);
      err.status = 400;
      err.raw = data;
      throw err;
    } catch (error) {
      const data = error.response?.data || {};
      const isPinPrompt = data.message && data.message.toLowerCase().includes('enter your mpesa pin');
      const hasTransactionId = data.transaction_request_id || data.transactionRequestId || data.transaction_request_id;

      if (isPinPrompt || (error.response?.status === 500 && hasTransactionId)) {
        return {
          success: true,
          transactionRequestId: data.transaction_request_id || data.transactionRequestId || data.transaction_request_id,
          message: data.message || data.msg || data.errorMessage || 'Payment initiated successfully'
        };
      }

      console.error('MegaPay initiate error:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkPaymentStatus(transactionRequestId) {
    try {
      const response = await axios.post(this.statusUrl, {
        api_key: this.apiKey,
        email: this.email,
        account_name: this.shortcode,
        transaction_request_id: transactionRequestId
      });

      return {
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        status: response.data.TransactionStatus,
        amount: response.data.TransactionAmount
      };
    } catch (error) {
      console.error('MegaPay status check error:', error.response?.data || error.message);
      throw error;
    }
  }

  async waitForPaymentCompletion(transactionRequestId, timeout = 60000) {
    const startTime = Date.now();
    const pollInterval = 3000;

    while (Date.now() - startTime < timeout) {
      const status = await this.checkPaymentStatus(transactionRequestId);

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

module.exports = MegaPayService;
module.exports.generateShortReference = generateShortReference;
