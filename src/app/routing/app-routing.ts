import {Routes} from "@angular/router";
import {PageNotFoundComponent} from "@views/page-not-found/page-not-found.component";
import {pathResolver} from "./path-resolver";
import {projectGuard} from "./project-grard";
import {routesInfo} from "./routes-info";

export const appRoutes: Routes = [
  {path: "", children: [{path: "", pathMatch: "full", redirectTo: routesInfo[0].path}, ...routesInfo], canActivate: [projectGuard]},
  {path: "**", component: PageNotFoundComponent, resolve: {redirect: pathResolver}}
];
