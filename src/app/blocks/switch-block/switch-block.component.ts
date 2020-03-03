import {ChangeDetectionStrategy, Component, EventEmitter, Input, NgZone, OnChanges, OnInit, Output} from '@angular/core';
import {clone, find, get} from 'lodash-es';
import {search} from 'jmespath';

@Component({
  selector: 'app-switch-block',
  templateUrl: './switch-block.component.html',
  styleUrls: ['./switch-block.component.scss']
})
export class SwitchBlockComponent implements OnInit, OnChanges {

  @Input() config;
  @Input() context;
  @Input() model: any = {};
  @Output() output = new EventEmitter();

  blocks = [];
  models = [];

  constructor(
    private readonly zone: NgZone
  ) { }

  ngOnInit() {
  }

  ngOnChanges(changes) {
    const cases = get(this.config, 'cases', []);
    const matchValue = search({ data: this.model, context: this.context }, get(this.config, 'valueGetter', 'data'));
    const match = find(cases, ({ value }) => value === matchValue);
    if (!!match) {
      this.blocks = get(match, 'blocks', []);
    } else {
      this.blocks = get(this.config, 'default.blocks', []);
    }
    this.models = this.blocks.map(blockDef => get(blockDef, 'defaultValue', {}));
    this.models.push({});
    setTimeout(() => {
      this.zone.run(() => {
        // this.workflow.runWorkflow();
        this.models[0] = clone(this.model);
      });
    }, 0);
  }

  finishAction(value) {
    this.output.emit(clone(value));
  }

}