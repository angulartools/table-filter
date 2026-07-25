import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed, effect, afterNextRender } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import moment from 'moment-timezone';
import { ControlMaterialComponent, ControlMaterialDateTimeComponent } from '@angulartoolsdr/control-material';
import { TranslationPipe, TranslationService } from '@angulartoolsdr/translation';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'lib-table-filter',
  templateUrl: './table-filter.html',
  styleUrls: ['./table-filter.scss'],
  imports: [ReactiveFormsModule, ControlMaterialComponent, ControlMaterialDateTimeComponent, TranslationPipe, MatMenu, MatMenuItem, MatMenuTrigger, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableFilter {

  private formBuilder = inject(FormBuilder);
  translate = inject(TranslationService);

  // Inputs e Outputs (Modernos)
  showBotaoFiltro = input(true);
  showOperador = input(true);
  showFiltroPeriodo = input(true);
  listaPeriodo = input<any[]>([]);
  defaultPeriodoIndex = input(-1);
  loading = input(false);
  onFiltroChange = output<any>();

  // Constantes
  readonly PERIODO_HOJE = 1;
  readonly PERIODO_ONTEM = 2;
  readonly PERIODO_SETE_DIAS = 3;
  readonly PERIODO_MES = 4;
  readonly PERIODO_INTERVALO = 5;
  readonly OPERADOR_E = 'AND';
  readonly OPERADOR_OR = 'OR';

  // Sinais de estado (Zoneless Friendly)
  listaOperador = [
    { id: this.OPERADOR_E, label: 'OPERADOR_E' },
    { id: this.OPERADOR_OR, label: 'OPERADOR_OU' }
  ];

  /** Garante que onFiltroChange só dispare após a inicialização completa do componente */
  private isInitialized = signal(false);

  minDateInicio = signal<Date | null>(null);
  minDateFim = signal<Date | null>(null);
  maxDateInicio = signal<Date | null>(null);
  maxDateFim = signal<Date | null>(null);

  // Substituição do Effect antigo por Computed (Derivação Limpa)
  listaPeriodoInterna = computed(() => {
    const lista = this.listaPeriodo();
    if (lista.length === 0) {
      return [
        { id: this.PERIODO_HOJE, label: 'HOJE', periodo: 'HOJE' },
        { id: this.PERIODO_ONTEM, label: 'ONTEM', periodo: 'ONTEM' },
        { id: this.PERIODO_SETE_DIAS, label: 'ULTIMOS_7_DIAS', periodo: 'ULTIMOS_7_DIAS' },
        { id: this.PERIODO_MES, label: 'MES_PASSADO', periodo: 'MES_PASSADO' },
        { id: this.PERIODO_INTERVALO, label: 'INTERVALO', isSelecaoPeriodo: true }
      ];
    }
    return lista;
  });

  // Formulário Tipado (Melhor Prática)
  formBuscar = this.formBuilder.group({
    searchControl: new FormControl<string | null>(null),
    operatorControl: new FormControl<any>(this.listaOperador[1]),
    periodo: new FormControl<any>(null),
    dataInicio: new FormControl<any>(null),
    dataFim: new FormControl<any>(null)
  });

  periodoValue = toSignal(this.formBuscar.get('periodo')!.valueChanges, {
    initialValue: this.formBuscar.get('periodo')?.value
  });

  operatorValue = toSignal(this.formBuscar.get('operatorControl')!.valueChanges, {
    initialValue: this.formBuscar.get('operatorControl')?.value
  });

  // Computed para monitorar se deve exibir os seletores de data
  exibirSelecaoPeriodo = computed(() => {
    return !!this.periodoValue()?.isSelecaoPeriodo;
  });

  searchSignal = toSignal(
    this.formBuscar.get('searchControl')!.valueChanges.pipe(
      debounceTime(1000)
    ),
    { initialValue: null } // Inicia nulo
  );

  periodoSelecionado = toSignal(
    this.formBuscar.get('periodo')!.valueChanges,
    { initialValue: this.formBuscar.get('periodo')?.value }
  );

  constructor() {

    // --- Effects de SETUP (executam durante a inicialização) ---

    // Seta valor padrão de período baseado no index
    effect(() => {
      const idx = Number(this.defaultPeriodoIndex());
      const lista = this.listaPeriodoInterna();

      if (idx > -1 && lista && lista[idx]) {
        const itemEncontrado = lista[idx];
        // emitEvent: true para acionar o effect do período e calcular as datas
        this.formBuscar.get('periodo')?.setValue(itemEncontrado, { emitEvent: true });
      }
    });

    // Controla o estado de disabled baseado no input loading
    effect(() => {
      const isLoading = this.loading();
      this.toggleFormState(isLoading);
    });

    // --- Effect do PERÍODO (atualiza datas, mas só emite para fora após inicialização) ---

    effect(() => {
      const item = this.periodoSelecionado();

      // Se limpou o período
      if (!item) {
        this.formBuscar.get('dataInicio')?.setValue(null, { emitEvent: false });
        this.formBuscar.get('dataFim')?.setValue(null, { emitEvent: false });
        if (this.isInitialized()) {
          this.changePesquisa();
        }
        return;
      }

      // Se for seleção de intervalo (Datas customizadas)
      if (item.isSelecaoPeriodo) {
        const dataInicioVal = this.formBuscar.get('dataInicio')?.value;
        const dataFimVal = this.formBuscar.get('dataFim')?.value;

        if (dataInicioVal) {
          const dInicio = moment(dataInicioVal).toDate();
          this.minDateFim.set(new Date(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate()));
        }
        if (dataFimVal) {
          const dFim = moment(dataFimVal).toDate();
          this.maxDateInicio.set(new Date(dFim.getFullYear(), dFim.getMonth(), dFim.getDate()));
        }

        if (this.isInitialized() && dataInicioVal && dataFimVal) {
          this.changePesquisa();
        }
      } else {
        // Período pré-definido: sempre atualiza as datas internas
        const periodoCalculado = this.getPeriodoDate(item.periodo);
        this.formBuscar.get('dataInicio')?.setValue(periodoCalculado.dataInicio, { emitEvent: false });
        this.formBuscar.get('dataFim')?.setValue(periodoCalculado.dataFim, { emitEvent: false });

        if (this.isInitialized()) {
          this.changePesquisa();
        }
      }
    });

    // --- Effect do SEARCH (só reage após inicialização) ---

    effect(() => {
      this.searchSignal(); // lê o sinal para criar dependência reativa
      if (this.isInitialized()) {
        this.changePesquisa();
      }
    });

    // --- Marca inicialização como concluída após o primeiro render ---
    // afterNextRender garante que todos os effects de setup já executaram
    afterNextRender(() => {
      this.isInitialized.set(true);
      // Disparo único consolidado no final da inicialização
      this.changePesquisa();
    });

  }

  private toggleFormState(disable: boolean) {
    const opts = { emitEvent: false };
    if (disable) {
      this.formBuscar.disable(opts);
    } else {
      this.formBuscar.enable(opts);
    }
  }

  changeOperador() {
    const searchVal = this.formBuscar.get('searchControl')?.value;
    if (searchVal) {
      this.changePesquisa();
    }
  }

  setOperador(opId: string) {
    const op = this.listaOperador.find(o => o.id === opId);
    if (op) {
      this.formBuscar.get('operatorControl')?.setValue(op);
      this.changeOperador();
    }
  }

  setPeriodo(item: any) {
    this.formBuscar.get('periodo')?.setValue(item);
  }

  changePesquisa() {
    let dataFim = this.formBuscar.get('dataFim')?.value;
    if (dataFim && typeof dataFim.toDate === 'function') {
      const rawDate = dataFim.toDate();
      dataFim = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 23, 59, 59, 59);
    }

    this.onFiltroChange.emit({
      filtro: this.formBuscar.get('searchControl')?.value,
      operador: this.formBuscar.get('operatorControl')?.value?.id,
      dataInicio: this.formBuscar.get('dataInicio')?.value,
      dataFim: dataFim,
      periodo: this.formBuscar.get('periodo')?.value
    });
  }

  getPeriodoDate(periodo: string) {
    const data = new Date();
    let dataInicio: string;
    let dataFim = data.toISOString().slice(0, 16);

    switch (periodo) {
      case 'ULTIMAS_1_HORA':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() - 1, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_6_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() - 6, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_12_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() - 12, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_24_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() - 24, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'ULTIMAS_48_HORAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours() - 48, data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes(), data.getSeconds()).toISOString().slice(0, 16);
        break;
      case 'HOJE':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1, data.getHours(), data.getMinutes()).toISOString().slice(0, 16);
        break;
      case 'ONTEM':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate() - 1).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().slice(0, 16);
        break;
      case 'ULTIMOS_7_DIAS':
        dataInicio = new Date(data.getFullYear(), data.getMonth(), data.getDate() - 7).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), data.getDate(), data.getHours(), data.getMinutes()).toISOString().slice(0, 16);
        break;
      case 'MES_PASSADO':
        dataInicio = new Date(data.getFullYear(), data.getMonth() - 1, 1).toISOString().slice(0, 16);
        dataFim = new Date(data.getFullYear(), data.getMonth(), 1).toISOString().slice(0, 16);
        break;
      default:
        dataInicio = dataFim = new Date().toISOString().slice(0, 16);
        break;
    }
    return { dataInicio, dataFim }
  }
}
