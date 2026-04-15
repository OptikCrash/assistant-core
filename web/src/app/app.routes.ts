import { Routes } from '@angular/router';
import { WorkspaceDetailComponent } from './pages/workspace-detail/workspace-detail.component';
import { WorkspaceListComponent } from './pages/workspace-list/workspace-list.component';
import { WorkspaceRegisterComponent } from './pages/workspace-register/workspace-register.component';

export const routes: Routes = [
    {
        path: '',
        component: WorkspaceListComponent
    },
    {
        path: 'workspace/new',
        component: WorkspaceRegisterComponent
    },
    {
        path: 'workspace/:id',
        component: WorkspaceDetailComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
