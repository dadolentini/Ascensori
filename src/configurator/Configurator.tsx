import { useState } from 'react';
import type { Scenario } from '../simulation/types';
import {
  createSimpleScenario,
  DEFAULT_SIMPLE_CONFIGURATION,
  numberFormat,
  validateSimpleConfiguration,
  type SimpleConfiguration,
} from './helpers';
import Icon from '../components/Icon';

type Draft = Record<keyof SimpleConfiguration, string>;
const draftOf = (input: SimpleConfiguration): Draft => ({
  elevators: String(input.elevators),
  floors: String(input.floors),
  employees: String(input.employees),
  capacity: String(input.capacity),
});
const valuesOf = (draft: Draft): SimpleConfiguration => ({
  elevators: draft.elevators === '' ? NaN : Number(draft.elevators),
  floors: draft.floors === '' ? NaN : Number(draft.floors),
  employees: draft.employees === '' ? NaN : Number(draft.employees),
  capacity: draft.capacity === '' ? NaN : Number(draft.capacity),
});

function NumberStepper({
  name,
  label,
  value,
  min,
  max = Number.MAX_SAFE_INTEGER,
  hint,
  error,
  onChange,
  onBlur,
}: {
  name: keyof SimpleConfiguration;
  label: string;
  value: string;
  min: number;
  max?: number;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = 'building-' + name,
    numeric = Number(value);
  const step = (direction: number) => {
    if (value === '' || !Number.isFinite(numeric)) onChange(String(min));
    else onChange(String(Math.min(max, Math.max(min, Math.round(numeric) + direction))));
  };
  return (
    <div className="field simple-field">
      <label htmlFor={id}>{label}</label>
      <div className={'number-stepper ' + (error ? 'stepper-invalid' : '')}>
        <button
          type="button"
          aria-label={'Diminuisci ' + label.toLowerCase()}
          disabled={value !== '' && numeric <= min}
          onClick={() => step(-1)}
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step="1"
          value={value}
          aria-invalid={!!error}
          aria-describedby={hint || error ? id + '-hint' : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          aria-label={'Aumenta ' + label.toLowerCase()}
          disabled={numeric >= max}
          onClick={() => step(1)}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      {(hint || error) && (
        <small id={id + '-hint'} className={error ? 'input-error' : 'field-hint'}>
          {error || hint}
        </small>
      )}
    </div>
  );
}

export default function Configurator({
  scenario,
  onChange,
  onRun,
  onCancel,
  running,
  progress,
  errors,
}: {
  scenario: Scenario;
  onChange: (scenario: Scenario) => void;
  onRun: () => void;
  onCancel: () => void;
  running: boolean;
  progress: number;
  progressLabel: string;
  errors: string[];
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    draftOf({
      elevators: scenario.elevatorCount,
      floors: scenario.totalFloors - 1,
      employees: scenario.groups.reduce((sum, group) => sum + group.employees, 0),
      capacity: scenario.physics.capacityPeople,
    }),
  );
  const [showErrors, setShowErrors] = useState(false);
  const input = valuesOf(draft),
    fieldErrors = validateSimpleConfiguration(input);
  const distributionValid = !fieldErrors.floors && !fieldErrors.employees;
  const base = Math.floor(input.employees / input.floors),
    remainder = input.employees % input.floors;
  const update = (name: keyof SimpleConfiguration, value: string) => {
    const next = { ...draft, [name]: value };
    setDraft(next);
    const values = valuesOf(next);
    if (!Object.keys(validateSimpleConfiguration(values)).length)
      onChange(createSimpleScenario(values));
  };
  const run = () => {
    setShowErrors(true);
    if (!Object.keys(fieldErrors).length) onRun();
    else document.getElementById('building-' + Object.keys(fieldErrors)[0])?.focus();
  };
  const reset = () => {
    setDraft(draftOf(DEFAULT_SIMPLE_CONFIGURATION));
    setShowErrors(false);
    onChange(createSimpleScenario(DEFAULT_SIMPLE_CONFIGURATION));
  };
  const simpleProgress =
    progress >= 0.96
      ? 'Prepariamo i risultati'
      : progress >= 0.12
        ? 'Confrontiamo le tre strategie'
        : 'Prepariamo la giornata';
  let distribution = 'Inserisci piani e addetti per calcolare la distribuzione.';
  if (distributionValid)
    distribution =
      remainder === 0
        ? 'Tutti i piani hanno ' + base + ' addetti.'
        : remainder +
          (remainder === 1 ? ' piano con ' : ' piani con ') +
          (base + 1) +
          ' addetti, i restanti con ' +
          base +
          '.';
  return (
    <div className="configuration-panel simple-configurator">
      <div className="panel-title">
        <span className="eyebrow">IL TUO EDIFICIO</span>
        <span className="model-badge">
          <span /> PRONTO IN POCHI PASSI
        </span>
      </div>
      <p className="simple-panel-intro">Quattro numeri. Al resto pensiamo noi.</p>
      <fieldset disabled={running} className="configuration-fields">
        <legend className="sr-only">Configurazione dell’edificio</legend>
        <div className="field-row">
          <NumberStepper
            name="elevators"
            label="Ascensori"
            value={draft.elevators}
            min={1}
            max={8}
            hint="Numero di cabine"
            error={showErrors ? fieldErrors.elevators : undefined}
            onChange={(value) => update('elevators', value)}
            onBlur={() => setShowErrors(true)}
          />
          <NumberStepper
            name="floors"
            label="Piani"
            value={draft.floors}
            min={1}
            max={39}
            hint="Escluso il piano terra"
            error={showErrors ? fieldErrors.floors : undefined}
            onChange={(value) => update('floors', value)}
            onBlur={() => setShowErrors(true)}
          />
        </div>
        <div className="field-row">
          <NumberStepper
            name="employees"
            label="Addetti complessivi"
            value={draft.employees}
            min={0}
            max={2000}
            hint="Persone nell’edificio"
            error={showErrors ? fieldErrors.employees : undefined}
            onChange={(value) => update('employees', value)}
            onBlur={() => setShowErrors(true)}
          />
          <NumberStepper
            name="capacity"
            label="Capacità per cabina"
            value={draft.capacity}
            min={1}
            hint="Numero massimo di persone"
            error={showErrors ? fieldErrors.capacity : undefined}
            onChange={(value) => update('capacity', value)}
            onBlur={() => setShowErrors(true)}
          />
        </div>
        <div className="automatic-distribution" aria-live="polite" aria-atomic="true">
          <div>
            <span>Persone per piano</span>
            <output aria-label="Media persone per piano">
              {distributionValid ? numberFormat(input.employees / input.floors, 1) : '—'}
            </output>
          </div>
          <p>{distribution}</p>
          <small>Distribuzione automatica, senza escludere nessuno.</small>
        </div>
      </fieldset>
      <p className="simple-schedule-note">
        <Icon name="clock" size={16} />
        <span>Orari e pause sono già impostati. Restano attivi i limiti di carico standard.</span>
      </p>
      {!!errors.length && (
        <div className="form-errors" role="alert">
          <strong>Il calcolo non è stato completato</strong>
          <p>
            {errors.some((error) =>
              /limite|budget|superato|maximum|maxDuration|time limit/i.test(error),
            )
              ? 'Questo edificio richiede un calcolo più lungo. Prova con meno addetti o più ascensori.'
              : errors[0]}
          </p>
        </div>
      )}
      <div className="run-controls">
        {running ? (
          <>
            <div className="run-progress" role="status" aria-label="Avanzamento simulazione">
              <span>{simpleProgress}</span>
              <strong>{Math.round(progress * 100)}%</strong>
              <progress aria-label="Progresso del calcolo" max="1" value={progress} />
            </div>
            <button type="button" className="outline-button" onClick={onCancel}>
              Annulla simulazione <Icon name="close" />
            </button>
          </>
        ) : (
          <button type="button" className="primary-button run-button" onClick={run}>
            Avvia simulazione <Icon name="arrow" />
          </button>
        )}
        <p className="run-caption">Una giornata simulata. Tre strategie a confronto.</p>
        <button className="reset-button" type="button" disabled={running} onClick={reset}>
          Ripristina i valori iniziali
        </button>
      </div>
    </div>
  );
}
