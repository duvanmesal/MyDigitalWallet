import { NgModule, Optional, SkipSelf } from '@angular/core';

import { AuthenticationService } from './services/authentication.service';
import { DatabaseService } from './services/database.service';
import { UserService } from './services/user.service';
import { PaymentMethodService } from './services/payment-method.service';
import { TransactionService } from './services/transaction.service';
import { SecurityService } from './services/security.service';
import { AlertService } from './services/alert.service';
import { MessageService } from './services/message.service';
import { ConfirmationService } from './services/confirmation.service';
import { ProgressService } from './services/progress.service';
import { ModalService } from './services/modal.service';
import { NetworkService } from './services/network.service';
import { SavingsService } from './services/savings.service';

/**
 * CoreModule agrupa todos los servicios singleton y guards de la aplicación.
 * Solo debe importarse una vez en AppModule.
 */
@NgModule({
  providers: [
    AuthenticationService,
    DatabaseService,
    UserService,
    PaymentMethodService,
    TransactionService,
    SecurityService,
    AlertService,
    MessageService,
    ConfirmationService,
    ProgressService,
    ModalService,
    NetworkService,
    SavingsService,
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule ya fue cargado. Importar solo en AppModule.');
    }
  }
}
