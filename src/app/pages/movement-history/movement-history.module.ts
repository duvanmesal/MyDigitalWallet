import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { MovementHistoryPage } from './movement-history.page';
import { MovementHistoryPageRoutingModule } from './movement-history-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, IonicModule, MovementHistoryPageRoutingModule, SharedModule],
  declarations: [MovementHistoryPage],
})
export class MovementHistoryPageModule {}
