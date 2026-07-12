const axios = require('axios');

class MegaPayService {
  constructor() {
    this.apiKey = 'MGPYRHI7RIdn';
    this.email = 'obavanteshia65@gmail.com';
    this.initiateUrl = 'https://megapay.co.ke/backend/v1/initiatestk';
    this.statusUrl = 'https://megapay.co.ke/backend/v1/transactionstatus';
  }

  async initiatePayment(phone, amount, reference) {
    try {
      const response = await axios.post(this.initiateUrl, {
        api_key: this.apiKey,
        email: this.email,
        amount: amount.toString(),
        msisdn: phone,
        reference: reference
      });

      if (response.data.success === '200') {
        return {
          success: true,
          transactionRequestId: response.data.transaction_request_id,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('MegaPay initiate error:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkPaymentStatus(transactionRequestId) {
    try {
      const response = await axios.post(this.statusUrl, {
        api_key: this.apiKey,
        email: this.email,
        transaction_request_id: transactionRequestId
      });

      return {
        resultCode: response.data.ResultCode,
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
