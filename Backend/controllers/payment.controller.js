const axios = require('axios');

exports.createPaymentSession = async (req, res) => {
    try {
        const { amount, currency, orderId, customerEmail, merchantRedirect } = req.body;

        const response = await axios.post(
            'https://api.kashier.io/v3/payment/sessions',
            {
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                maxFailureAttempts: 3,
                paymentType: 'credit',
                amount: amount.toString(),
                currency: currency,
                order: orderId,
                merchantRedirect: merchantRedirect,
                display: 'en',
                type: 'one-time',
                allowedMethods: 'card,wallet',
                merchantId: 'MID-33946-809',
                description: `Payment for order ${orderId}`,
                customer: {
                    email: customerEmail,
                    reference: orderId,
                },
                enable3DS: true,
            },
            {
                headers: {
                    Authorization:'973b0dc2ccf0637a30678d466d500fca$7f67049c87c51118945136e99e4ed59bfd9e7d375831863a8c7dd8644bc38e79822c7c83637ce775a7f91992daa45a33',
                    'api-key': '8309ba82-761f-4235-8e0a-7079ff6fa6fd',
                    'Content-Type': 'application/json',
                },
            }
        );

        res.status(200).json({
            sessionUrl: response.data.sessionUrl,
        });
    } catch (error) {
        console.error('Error creating payment session:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        res.status(500).json({ error: 'Failed to create payment session', details: error.message });
    }
};
