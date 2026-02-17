import { PaymentService } from "./payment.service";
import { TransactionService } from "./transaction.service";

export class zarinPalController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly transactionService: TransactionService,
    ) {}
}