import express from 'express';
import cors from 'cors';
import { PaymentController } from './payment.controller';
import checkAuth from '../../middlewares/checkAuth';
import { Role } from '../user/user.interface';

const router = express.Router();

// SSLCommerz POSTs form-data to these callback URLs from its own domain.
// They are NOT browser fetch/XHR calls, so the global CORS policy blocks them.
// We apply a fully permissive CORS policy only to these gateway-callback routes.
const sslCors = cors({ origin: '*' });

router.post(
  '/init-payment/:bookingId',
  checkAuth(...Object.values(Role)),
  PaymentController.initPayment
);
router
  .route('/success')
  .get(sslCors, PaymentController.successPayment)
  .post(sslCors, PaymentController.successPayment);
router
  .route('/fail')
  .get(sslCors, PaymentController.failPayment)
  .post(sslCors, PaymentController.failPayment);
router
  .route('/cancel')
  .get(sslCors, PaymentController.cancelPayment)
  .post(sslCors, PaymentController.cancelPayment);

router.get(
  '/invoice/:paymentId',
  checkAuth(...Object.values(Role)),
  PaymentController.getInvoiceDownloadURL
);
router
  .route('/validate-payment')
  .get(PaymentController.validatePayment)
  .post(PaymentController.validatePayment);
router
  .route('/ipn')
  .get(sslCors, PaymentController.validatePayment)
  .post(sslCors, PaymentController.validatePayment);

export const PaymentRoutes = router;
