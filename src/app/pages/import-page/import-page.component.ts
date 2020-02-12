import { Component, OnInit } from '@angular/core';
import { PageTitleService } from '../../services/page-title.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ImportProgressDialogComponent } from '../../dialogs/import-progress-dialog/import-progress-dialog.component';
import { AddNewNodeDialogComponent } from '../../dialogs/add-new-node-dialog/add-new-node-dialog.component';
import { HttpClient } from '@angular/common/http';
import { DocumentRepositoryService } from '../../services/document-repository.service';

@Component({
  selector: 'app-import-page',
  templateUrl: './import-page.component.html',
  styleUrls: ['./import-page.component.scss']
})
export class ImportPageComponent implements OnInit {

  addNodeType;
  file;
  fileImportReady = false;

  constructor(
    private readonly docsRepo: DocumentRepositoryService,
    private readonly router: Router,
    private readonly pageTitle: PageTitleService,
    private readonly dialog: MatDialog,
    private readonly http: HttpClient
  ) { }

  ngOnInit() {
    this.pageTitle.setTitle('importPage.pageTitle');
  }

  fileSelected(event) {
    if (event.target.files && event.target.files.length > 0) {
      this.file = event.target.files[0];
      this.fileImportReady = true;
    }
  }

  doAddNode() {
    const dialogRef = this.dialog.open(AddNewNodeDialogComponent, {
      data: {
        type: this.addNodeType
      }
    });
    dialogRef.afterClosed().subscribe((data) => {
      if (data) {
        this.docsRepo.addNew(this.addNodeType, data).subscribe(({ id }) => {
          this.router.navigate(['/docs', id]);
        });
      }
    });
  }

  importFile() {
    const reader = new FileReader();
    reader.onload = e => {
      const { result } = e.target as any;
      this.doImport(result);
    };
    reader.readAsText(this.file);
  }

  importSampleData() {
    this.http.get('assets/data/rin-sample-01.xml', { responseType: 'text' }).subscribe(content => {
      this.doImport(content);
    });
  }

  doImport(content) {
    const dialogRef = this.dialog.open(ImportProgressDialogComponent, {
      disableClose: true,
      data: { content }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/docs']);
    });
  }
}
