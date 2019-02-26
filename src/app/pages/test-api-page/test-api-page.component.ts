import {Component, OnInit} from '@angular/core';
import {TestDataService} from '../../services/test-data.service';
import {Subject} from 'rxjs';
import {switchMap, take, tap, withLatestFrom} from 'rxjs/operators';
import {ImportProgressDialogComponent} from '../../dialogs/import-progress-dialog/import-progress-dialog.component';
import {Router} from '@angular/router';
import {PageTitleService} from '../../services/page-title.service';
import {MatDialog} from '@angular/material';
import {TestImportDialogComponent} from '../../dialogs/test-import-dialog/test-import-dialog.component';

@Component({
  selector: 'app-test-api-page',
  templateUrl: './test-api-page.component.html',
  styleUrls: ['./test-api-page.component.scss']
})
export class TestApiPageComponent implements OnInit {

  entityTypes$;

  selectedType;
  entityList$;

  selectedEntity$;

  listAll$;

  constructor(
    private readonly testData: TestDataService,
    private readonly router: Router,
    private readonly pageTitle: PageTitleService,
    private readonly dialog: MatDialog,
  ) {
  }

  ngOnInit() {
    this.entityTypes$ = this.testData.listEntityTypes();
    this.entityList$ = new Subject<string>().pipe(
      switchMap(type => this.testData.listEntities(type))
    );
    this.selectedEntity$ = new Subject<number>().pipe(
      switchMap(id => this.testData.getEntity(this.selectedType, id))
    );
    this.listAll$ = new Subject<string>().pipe(
      switchMap(type => this.testData.listAll(type))
    );
  }

  changeEntityType(type) {
    this.selectedType = type;
    this.entityList$.next(type);
  }

  changeEntity(id) {
    this.selectedEntity$.next(id);
  }

  listAll() {
    this.listAll$.next(this.selectedType);
  }

  importAll() {
    const type = this.selectedType;
    this.testData.listAll(type).pipe(take(1)).subscribe(records => {
      this.doImport({ type, records });
    });
  }

  doImport(content) {
    const dialogRef = this.dialog.open(TestImportDialogComponent, {
      disableClose: true,
      data: {content}
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/docs']);
    });
  }
}