import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { ControlMaterialFilterComponent, ControlMaterialSelectComponent, ControlMaterialDateTimeComponent } from '@angulartoolsdr/control-material';
import { TranslationPipe, TranslationService } from '@angulartoolsdr/translation';
import { debounceTime } from 'rxjs';
import moment from 'moment';

@Component({
  selector: 'te-table-filter',
  templateUrl: './table-filter.html',
  imports: [FormsModule, ReactiveFormsModule, ControlMaterialFilterComponent, ControlMaterialSelectComponent, TranslationPipe, ControlMaterialDateTimeComponent]
})
export class TableFilter implements OnInit {

  @Input() showBotaoFiltro = true;
  @Input() showOperador = true;
  @Input() showFiltroPeriodo = true;
  @Input() listaPeriodo: any[] = [];
  @Input() defaultPeriodoIndex = -1;

  @Input('loading')
  set _loading(value: boolean) {
    this.loading = value;    
    this.disableFields();
  }

  @Output() onFiltroChange: EventEmitter<any> = new EventEmitter();

  formBuscar: UntypedFormGroup;
  listaOperador: any[];
  translateData = true;
  loading = false;

  // Filtros por data
  PERIODO_HOJE = 1;
  PERIODO_ONTEM = 2;
  PERIODO_SETE_DIAS = 3;
  PERIODO_MES = 4;
  PERIODO_INTERVALO = 5;
  OPERADOR_E = 'AND';
  OPERADOR_OR = 'OR';

  minDateInicio;
  minDateFim;
  maxDateInicio;
  maxDateFim;

  translate = inject(TranslationService) ;

  constructor(private formBuilder: FormBuilder) {

    this.listaOperador = [{id: this.OPERADOR_E, label: 'OPERADOR_E'}, {id: this.OPERADOR_OR, label: 'OPERADOR_OU'}];

    if (this.listaPeriodo?.length === 0) {
      this.listaPeriodo = [
        { id: this.PERIODO_HOJE, label: 'HOJE', periodo: 'HOJE' },
        { id: this.PERIODO_ONTEM, label: 'ONTEM', periodo: 'ONTEM' },
        { id: this.PERIODO_SETE_DIAS, label: 'ULTIMOS_7_DIAS', periodo: 'ULTIMOS_7_DIAS' },
        { id: this.PERIODO_MES, label: 'MES_PASSADO', periodo: 'MES_PASSADO' },
        { id: this.PERIODO_INTERVALO, label: 'INTERVALO', isSelecaoPeriodo: true }
      ];
    }

    this.formBuscar = this.formBuilder.group({
      searchControl: this.formBuilder.control(null),
      operatorControl: this.formBuilder.control(this.listaOperador[1]),
      periodo: this.formBuilder.control(null),
      dataInicio: this.formBuilder.control(null),
      dataFim: this.formBuilder.control(null)
    });

    this.formBuscar.get('searchControl')?.valueChanges.pipe(debounceTime(1000)).subscribe(form => {
      this.changePesquisa();
    });
  }

  disableFields() {
    if (this.formBuscar != null) {
      if (this.loading) {
        this.formBuscar.get('searchControl')?.disable({emitEvent: false});
        this.formBuscar.get('operatorControl')?.disable({emitEvent: false});
        this.formBuscar.get('periodo')?.disable({emitEvent: false});
        this.formBuscar.get('dataInicio')?.disable({emitEvent: false});
        this.formBuscar.get('dataFim')?.disable({emitEvent: false});
        this.formBuscar.updateValueAndValidity({onlySelf: true, emitEvent: false});
      } else {
        this.formBuscar.get('searchControl')?.enable({emitEvent: false});
        this.formBuscar.get('operatorControl')?.enable({emitEvent: false});
        this.formBuscar.get('periodo')?.enable({emitEvent: false});
        this.formBuscar.get('dataInicio')?.enable({emitEvent: false});
        this.formBuscar.get('dataFim')?.enable({emitEvent: false});
        this.formBuscar.updateValueAndValidity({onlySelf: true, emitEvent: false});
      }
    }
  }

  ngOnInit(): void {
    if (this.defaultPeriodoIndex > -1) {
      this.formBuscar.get('periodo').setValue(this.listaPeriodo[this.defaultPeriodoIndex]);
    }
  }

  changeOperador() {
    if (this.formBuscar.get('searchControl')?.value !== undefined && this.formBuscar.get('searchControl')?.value !== null && this.formBuscar.get('searchControl')?.value !== '') {
      this.changePesquisa();
    }
  }

  changePeriodo(item) {

    if (item === null || item === undefined) {
      this.formBuscar.get('dataInicio')?.setValue(null);
      this.formBuscar.get('dataFim')?.setValue(null);
      this.changePesquisa();
      return;
    }

    if (item.value.isSelecaoPeriodo) {
      const dataDataInicio = moment(this.formBuscar.get('dataInicio').value).toDate();
      this.minDateFim = new Date(dataDataInicio.getFullYear(), dataDataInicio.getMonth(), dataDataInicio.getDate(), 0, 0, 0);

      const dataDataFim = moment(this.formBuscar.get('dataFim').value).toDate();
      this.maxDateInicio = new Date(dataDataFim.getFullYear(), dataDataFim.getMonth(), dataDataFim.getDate(), 0, 0, 0);


      if (this.formBuscar.get('dataInicio').value !== null && this.formBuscar.get('dataFim').value !== null) {
        this.changePesquisa();
      }
    } else  {
      const periodo = this.getPeriodoDate(item.value.periodo);
      this.formBuscar.get('dataInicio')?.setValue(periodo.dataInicio);
      this.formBuscar.get('dataFim')?.setValue(periodo.dataFim);
      this.changePesquisa();
    }
  }

  changePesquisa() {

    let dataFim = this.formBuscar.get('dataFim')?.value;
    try {
      dataFim = this.formBuscar.get('dataFim')?.value.toDate();
      dataFim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate(), 23, 59, 59, 59);
    } catch (e) {}

    this.onFiltroChange.emit({
      filtro: this.formBuscar.get('searchControl')?.value,
      operador: this.formBuscar.get('operatorControl')?.value?.id,
      dataInicio: this.formBuscar.get('dataInicio')?.value,
      dataFim: dataFim,
      periodo: this.formBuscar.get('periodo')?.value
    });

  }

  getPeriodoDate(periodo) {
    const data = new Date();
    let dataInicio;
    let dataFim;

    switch (periodo) {
      case 'ULTIMAS_1_HORA':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() -1, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_6_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() -6, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_12_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() -12, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_24_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() -24, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_48_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() -48, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'HOJE':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1, data.getHours(), data.getMinutes()).toISOString().slice(0, 16);
        break;
      case 'ONTEM':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate()-1).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().slice(0, 16);
        break;
      case 'ULTIMOS_7_DIAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate()-7).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes()).toISOString().slice(0, 16);
        break;
      case 'MES_PASSADO':
        dataInicio = new Date(data.getFullYear(), data.getMonth()-1, 1).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), 1).toISOString().slice(0, 16);
        break;
      default:
        dataInicio = dataFim = new Date().toISOString().slice(0, 16);
        break;
    }
    return {dataInicio, dataFim}
  }
}
