import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MAT_DIALOG_DEFAULT_OPTIONS, MatButton, MatDialog, MatDialogClose } from '@angular/material';
import { Router } from '@angular/router';
import { Animations } from 'src/app/_shared/animations';
import { AdaptersService } from 'src/app/services/adapters.service';

export interface DistributionProgress {
  name: string;
  step: number;
  percentComplete: number;
  icon: string;
}

let PROGRESS_DATA: DistributionProgress[] = [
  {step: 1, name: 'Releases Selected', percentComplete: 100, icon: 'done'},
  {step: 2, name: 'Data confirmed', percentComplete: 100, icon: 'done'},

];

@Component({
  selector: 'app-publish',
  templateUrl: './publish.component.html',
  styleUrls: ['./publish.component.scss'],
  animations: [Animations.pageAni]
})
export class PublishComponent implements OnInit {  
  nextStep = false;
  displayedColumns: string[] = ['step', 'name', 'percentComplete', 'icon'];
  dataSource = [] ;
  nextDataSource = [] ;
  

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly router: Router,
    private readonly adapters: AdaptersService
  ) { }

  ngOnInit() {
    PROGRESS_DATA = [
      {step: 1, name: 'Releases Selected', percentComplete: 100, icon: 'done'},
      {step: 2, name: 'Data confirmed', percentComplete: 100, icon: 'done'},    
    ];
    this.dataSource = [];
    this.nextDataSource = [];
    this.dataSource = PROGRESS_DATA;  
  }
// Object.keys(adapters);
  get enabled() { return Object.keys(this.adapters.enabledAdapters); }
  
  onNextStep() {
    this.nextDataSource = [];
    this.nextDataSource = PROGRESS_DATA;  
    this.enabled.forEach(input => {
      this.nextDataSource.push(  {
        step: this.nextDataSource.length + 1, 
        name: 'Sent to: ' + input, 
        percentComplete: this.nextDataSource.length * 3, 
        icon: 'schedule'});
    });
    this.nextStep = true;
    this.dataSource = [];
 this.dataSource = this.nextDataSource;
  }

  nextClaimStep3(section: string) {

  //  localStorage.setItem(section, JSON.stringify(this.data.data));
   // this.router.navigate(['/claims']);

  }

  removeClaim(i) {
    this.data.splice(i, 1);
  }

}
