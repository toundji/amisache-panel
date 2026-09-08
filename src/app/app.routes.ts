import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './shared/layout/dashboard-layout/dashboard-layout.component';
import { HomeComponent } from './components/dashboard/home/home.component';
import { UserListComponent } from './components/users/user-list/user-list.component';
import { UserCreateComponent } from './components/users/user-create/user-create.component';
import { UserDetailComponent } from './components/users/user-detail/user-detail.component';
import { ProfileComponent } from './components/profile/profile.component';
import { SessionsComponent } from './components/sessions/sessions.component';
import { MailFailedListComponent } from './components/mail/mail-failed-list/mail-failed-list.component';
import { ContactListComponent } from './components/contact/contact-list/contact-list.component';
import { ContactDetailComponent } from './components/contact/contact-detail/contact-detail.component';
import { FaqListComponent } from './components/faq/faq-list/faq-list.component';
import { FaqCreateComponent } from './components/faq/faq-create/faq-create.component';
import { FaqDetailComponent } from './components/faq/faq-detail/faq-detail.component';
import { SettingsListComponent } from './components/settings/settings-list/settings-list.component';
import { SettingsCreateComponent } from './components/settings/settings-create/settings-create.component';
import { SettingsDetailComponent } from './components/settings/settings-detail/settings-detail.component';
import { NotificationListComponent } from './components/notifications/notification-list/notification-list.component';
import { ConversationListComponent } from './components/chat/conversation-list/conversation-list.component';
import { ConversationCreateComponent } from './components/chat/conversation-create/conversation-create.component';
import { ConversationDetailComponent } from './components/chat/conversation-detail/conversation-detail.component';
import { CountryListComponent } from './components/address/country-list/country-list.component';
import { CountryCreateComponent } from './components/address/country-create/country-create.component';
import { CountryDetailComponent } from './components/address/country-detail/country-detail.component';
import { RegionListComponent } from './components/address/region-list/region-list.component';
import { RegionCreateComponent } from './components/address/region-create/region-create.component';
import { RegionDetailComponent } from './components/address/region-detail/region-detail.component';
import { ZoneListComponent } from './components/address/zone-list/zone-list.component';
import { ZoneCreateComponent } from './components/address/zone-create/zone-create.component';
import { ZoneDetailComponent } from './components/address/zone-detail/zone-detail.component';
import { VillageListComponent } from './components/address/village-list/village-list.component';
import { VillageCreateComponent } from './components/address/village-create/village-create.component';
import { VillageDetailComponent } from './components/address/village-detail/village-detail.component';
import { TypeListComponent } from './components/type/type-list/type-list.component';
import { TypeCreateComponent } from './components/type/type-create/type-create.component';
import { TypeDetailComponent } from './components/type/type-detail/type-detail.component';
import { ChurchListComponent } from './components/church/church-list/church-list.component';
import { ChurchCreateComponent } from './components/church/church-create/church-create.component';
import { ChurchDetailComponent } from './components/church/church-detail/church-detail.component';
import { ChurchTreeComponent } from './components/church/church-tree/church-tree.component';
import { ClergyMemberListComponent } from './components/church/clergy-member-list/clergy-member-list.component';
import { ClergyMemberCreateComponent } from './components/church/clergy-member-create/clergy-member-create.component';
import { ClergyMemberDetailComponent } from './components/church/clergy-member-detail/clergy-member-detail.component';
import { EntranceListComponent } from './components/church/entrance-list/entrance-list.component';
import { EntranceCreateComponent } from './components/church/entrance-create/entrance-create.component';
import { EntranceDetailComponent } from './components/church/entrance-detail/entrance-detail.component';
import { MembershipListComponent } from './components/church/membership-list/membership-list.component';
import { ScheduleListComponent } from './components/liturgy/schedule-list/schedule-list.component';
import { ScheduleCreateComponent } from './components/liturgy/schedule-create/schedule-create.component';
import { ScheduleDetailComponent } from './components/liturgy/schedule-detail/schedule-detail.component';
import { RequestListComponent } from './components/liturgy/request-list/request-list.component';
import { RequestDetailComponent } from './components/liturgy/request-detail/request-detail.component';
import { DonationListComponent } from './components/liturgy/donation-list/donation-list.component';
import { DonationDetailComponent } from './components/liturgy/donation-detail/donation-detail.component';
import { PaymentMethodListComponent } from './components/payment/payment-method-list/payment-method-list.component';
import { PaymentMethodCreateComponent } from './components/payment/payment-method-create/payment-method-create.component';
import { PaymentMethodDetailComponent } from './components/payment/payment-method-detail/payment-method-detail.component';
import { PaymentDetailComponent } from './components/payment/payment-detail/payment-detail.component';
import { PaymentListComponent } from './components/payment/payment-list/payment-list.component';
import { GroupListComponent } from './components/community/group-list/group-list.component';
import { GroupCreateComponent } from './components/community/group-create/group-create.component';
import { GroupDetailComponent } from './components/community/group-detail/group-detail.component';
import { PublicationListComponent } from './components/community/publication-list/publication-list.component';
import { PublicationCreateComponent } from './components/community/publication-create/publication-create.component';
import { PublicationDetailComponent } from './components/community/publication-detail/publication-detail.component';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: HomeComponent, title: 'Tableau de bord' },
      { path: 'users', component: UserListComponent, title: 'Utilisateurs' },
      { path: 'users/new', component: UserCreateComponent, title: 'Nouvel utilisateur' },
      { path: 'users/:id', component: UserDetailComponent, title: 'Détail utilisateur' },
      { path: 'profile', component: ProfileComponent, title: 'Mon profil' },
      { path: 'sessions', component: SessionsComponent, title: 'Mes sessions' },
      { path: 'mail/failed', component: MailFailedListComponent, title: 'Emails échoués' },
      { path: 'contact', component: ContactListComponent, title: 'Messages de contact' },
      { path: 'contact/:id', component: ContactDetailComponent, title: 'Détail message' },
      { path: 'faq', component: FaqListComponent, title: 'FAQ' },
      { path: 'faq/new', component: FaqCreateComponent, title: 'Nouvelle question' },
      { path: 'faq/:id', component: FaqDetailComponent, title: 'Détail FAQ' },
      { path: 'geo/countries', component: CountryListComponent, title: 'Pays' },
      { path: 'geo/countries/new', component: CountryCreateComponent, title: 'Nouveau pays' },
      { path: 'geo/countries/:id', component: CountryDetailComponent, title: 'Détail pays' },
      { path: 'geo/regions', component: RegionListComponent, title: 'Régions' },
      { path: 'geo/regions/new', component: RegionCreateComponent, title: 'Nouvelle région' },
      { path: 'geo/regions/:id', component: RegionDetailComponent, title: 'Détail région' },
      { path: 'geo/zones', component: ZoneListComponent, title: 'Zones' },
      { path: 'geo/zones/new', component: ZoneCreateComponent, title: 'Nouvelle zone' },
      { path: 'geo/zones/:id', component: ZoneDetailComponent, title: 'Détail zone' },
      { path: 'geo/villages', component: VillageListComponent, title: 'Villages / Quartiers' },
      { path: 'geo/villages/new', component: VillageCreateComponent, title: 'Nouveau village/quartier' },
      { path: 'geo/villages/:id', component: VillageDetailComponent, title: 'Détail village/quartier' },
      { path: 'types', component: TypeListComponent, title: 'Types' },
      { path: 'types/new', component: TypeCreateComponent, title: 'Nouveau type' },
      { path: 'types/:id', component: TypeDetailComponent, title: 'Détail type' },
      { path: 'churches', component: ChurchListComponent, title: 'Entités ecclésiales' },
      { path: 'churches/new', component: ChurchCreateComponent, title: 'Nouvelle entité' },
      { path: 'churches/tree', component: ChurchTreeComponent, title: 'Arborescence des entités' },
      { path: 'churches/:id', component: ChurchDetailComponent, title: 'Détail entité' },
      { path: 'clergy-members', component: ClergyMemberListComponent, title: 'Clergé & personnel' },
      { path: 'clergy-members/new', component: ClergyMemberCreateComponent, title: 'Nouvelle affectation' },
      { path: 'clergy-members/:id', component: ClergyMemberDetailComponent, title: 'Détail affectation' },
      { path: 'entrances', component: EntranceListComponent, title: 'Entrées' },
      { path: 'entrances/new', component: EntranceCreateComponent, title: 'Nouvelle entrée' },
      { path: 'entrances/:id', component: EntranceDetailComponent, title: 'Détail entrée' },
      { path: 'memberships', component: MembershipListComponent, title: 'Abonnements fidèles' },
      { path: 'liturgy/schedules', component: ScheduleListComponent, title: 'Horaires liturgiques' },
      { path: 'liturgy/schedules/new', component: ScheduleCreateComponent, title: 'Nouvel horaire' },
      { path: 'liturgy/schedules/:id', component: ScheduleDetailComponent, title: 'Détail horaire' },
      { path: 'liturgy/requests', component: RequestListComponent, title: 'Demandes' },
      { path: 'liturgy/requests/:id', component: RequestDetailComponent, title: 'Détail demande' },
      { path: 'liturgy/donations', component: DonationListComponent, title: 'Dons' },
      { path: 'liturgy/donations/:id', component: DonationDetailComponent, title: 'Détail don' },
      { path: 'payment/methods', component: PaymentMethodListComponent, title: 'Moyens de paiement' },
      { path: 'payment/methods/new', component: PaymentMethodCreateComponent, title: 'Nouveau moyen de paiement' },
      { path: 'payment/methods/:id', component: PaymentMethodDetailComponent, title: 'Détail moyen de paiement' },
      { path: 'payment/transactions', component: PaymentListComponent, title: 'Paiements' },
      { path: 'payment/transactions/:id', component: PaymentDetailComponent, title: 'Détail paiement' },
      { path: 'community/groups', component: GroupListComponent, title: 'Groupes' },
      { path: 'community/groups/new', component: GroupCreateComponent, title: 'Nouveau groupe' },
      { path: 'community/groups/:id', component: GroupDetailComponent, title: 'Détail groupe' },
      { path: 'community/publications', component: PublicationListComponent, title: 'Publications' },
      { path: 'community/publications/new', component: PublicationCreateComponent, title: 'Nouvelle publication' },
      { path: 'community/publications/:id', component: PublicationDetailComponent, title: 'Détail publication' },
      { path: 'settings', component: SettingsListComponent, title: 'Paramètres' },
      { path: 'settings/new', component: SettingsCreateComponent, title: 'Nouveau setting' },
      { path: 'settings/:id', component: SettingsDetailComponent, title: 'Détail setting' },
      { path: 'notifications', component: NotificationListComponent, title: 'Notifications' },
      { path: 'chat', component: ConversationListComponent, title: 'Chat' },
      { path: 'chat/new', component: ConversationCreateComponent, title: 'Nouvelle conversation' },
      { path: 'chat/:id', component: ConversationDetailComponent, title: 'Conversation' },
    ],
  },
  {
    path: 'auth/login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./components/auth/login/login.component').then((c) => c.LoginComponent),
    title: 'Connexion',
  },
  { path: '**', redirectTo: '' },
];
