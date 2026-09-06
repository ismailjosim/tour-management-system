/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import { PaymentService } from './payment.service';
import httpStatus from 'http-status-codes';
import { environmentVariables } from '../../configs/env';
import sendResponse from '../../utils/sendResponse';
import { JwtPayload } from 'jsonwebtoken';

const buildPaymentRedirectUrl = (
  baseUrl: string,
  payload: Record<string, string>,
  status: string,
  message: string
) => {
  const transactionId = payload.tran_id || payload.transactionId || payload.transaction_id;
  const params = new URLSearchParams({
    transactionId: transactionId || '',
    amount: payload.amount || '',
    status,
    message,
  });

  return `${baseUrl}?${params.toString()}`;
};

const initPayment = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;
  const decodedToken = req.user as JwtPayload;
  const result = await PaymentService.initPaymentIntoDB(
    bookingId as string,
    decodedToken.userId,
    decodedToken.role
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payment done successfully',
    data: result,
  });
});

const successPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const payload = {
    ...(req.query as Record<string, string>),
    ...(req.body as Record<string, string>),
  };
  const result = await PaymentService.successPaymentIntoDB(payload);

  if (result.success) {
    res.redirect(
      303,
      buildPaymentRedirectUrl(
        environmentVariables.SSL.SSL_SUCCESS_FRONTEND_URL,
        payload,
        'success',
        result.message
      )
    );
  }
});
const failPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const payload = {
    ...(req.query as Record<string, string>),
    ...(req.body as Record<string, string>),
  };
  const result = await PaymentService.failPaymentIntoDB(payload);

  if (result.success) {
    res.redirect(
      303,
      buildPaymentRedirectUrl(
        environmentVariables.SSL.SSL_FAIL_FRONTEND_URL,
        payload,
        'fail',
        result.message
      )
    );
  }
});
const cancelPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const payload = {
    ...(req.query as Record<string, string>),
    ...(req.body as Record<string, string>),
  };
  const result = await PaymentService.cancelPaymentIntoDB(payload);

  if (result.success) {
    res.redirect(
      303,
      buildPaymentRedirectUrl(
        environmentVariables.SSL.SSL_CANCEL_FRONTEND_URL,
        payload,
        'cancel',
        result.message
      )
    );
  }
});

const getInvoiceDownloadURL = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const paymentId = req.params.paymentId as string;
    const decodedToken = req.user as JwtPayload;
    const result = await PaymentService.getInvoiceDownloadURLFromDB(
      paymentId,
      decodedToken.userId,
      decodedToken.role
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Invoice Download URL Retrieved successfully',
      data: result?.invoiceUrl,
    });
  }
);
const validatePayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const payload = {
    ...(req.query as Record<string, string>),
    ...(req.body as Record<string, string>),
  };
  const result = await PaymentService.validatePaymentIntoDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Payment Validated successfully',
    data: result,
  });
});

export const PaymentController = {
  initPayment,
  successPayment,
  failPayment,
  cancelPayment,
  getInvoiceDownloadURL,
  validatePayment,
};
