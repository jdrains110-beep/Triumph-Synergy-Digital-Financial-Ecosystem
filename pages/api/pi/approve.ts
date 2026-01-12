import { NextApiRequest, NextApiResponse } from 'next';
import { Pi } from 'pi-sdk-js';

// Replace with your Pi App credentials
const PI_API_KEY = process.env.PI_API_KEY || '';
const PI_APP_ID = process.env.PI_APP_ID || '';

// Approve payment endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { paymentId } = req.body;
  try {
    // Approve the payment using Pi SDK
    await Pi.ApprovePayment({
      paymentId,
      apiKey: PI_API_KEY,
      appId: PI_APP_ID,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
