import { useState } from 'react';
import type { Scenario, Group, Break } from '../simulation/types';
import { DEFAULT_SCENARIO } from '../simulation/scenario';
import { parseClock, formatClock, applyBreakToFloors, redistributeEmployees } from './helpers';
import Icon from '../components/Icon';
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? NaN : +e.target.value)}
        />
        {unit && <small>{unit}</small>}
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="time"
        value={formatClock(value)}
        onChange={(e) => {
          const v = parseClock(e.target.value);
          if (v !== null) onChange(v);
        }}
      />
    </label>
  );
}
export default function Configurator({
  scenario,
  onChange,
  onRun,
  onCancel,
  running,
  progress,
  progressLabel,
  errors,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  onRun: () => void;
  onCancel: () => void;
  running: boolean;
  progress: number;
  progressLabel: string;
  errors: string[];
}) {
  const [from, setFrom] = useState(1),
    [to, setTo] = useState(15),
    [selected, setSelected] = useState('U12-FOCUS');
  const [pause, setPause] = useState<Break>({
    id: 'pranzo',
    start: 46800,
    duration: 3600,
    participation: 0.72,
    sigma: 540,
  });
  const [note, setNote] = useState('');
  const set = <K extends keyof Scenario>(k: K, v: Scenario[K]) => onChange({ ...scenario, [k]: v });
  const phys = (k: keyof Scenario['physics'], v: number) =>
    set('physics', { ...scenario.physics, [k]: v });
  const total = scenario.groups.reduce((n, g) => n + g.employees, 0),
    group = scenario.groups.find((g) => g.id === selected) ?? scenario.groups[0];
  const editGroup = (next: Group) =>
    set(
      'groups',
      scenario.groups.map((g) => (g.id === next.id ? next : g)),
    );
  const apply = (append: boolean) => {
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 1 ||
      to < from ||
      to >= scenario.totalFloors
    ) {
      setNote('Scegli un intervallo di piani valido, escluso il terra.');
      return;
    }
    const next = { ...pause, id: append ? `pausa-${Date.now()}` : 'pranzo' };
    set('groups', applyBreakToFloors(scenario.groups, from, to, next, append));
    setNote(
      `${append ? 'Pausa aggiunta' : 'Pausa sostituita'} ai gruppi sui piani ${from}–${to}. Controlla eventuali sovrapposizioni.`,
    );
  };
  return (
    <div className="configuration-panel">
      <div className="panel-title">
        <span className="eyebrow">IL TUO SCENARIO</span>
        <span className="model-badge">
          <span /> MODELLO DCS
        </span>
      </div>
      <fieldset disabled={running} className="configuration-fields">
        <legend className="sr-only">Configurazione dell’edificio</legend>
        <div className="section-line">
          <span>01</span>
          <h3>L’edificio</h3>
          <Icon name="grid" />
        </div>
        <div className="field-row">
          <NumberField
            label="Ascensori"
            value={scenario.elevatorCount}
            min={1}
            max={8}
            onChange={(v) => set('elevatorCount', v)}
          />
          <NumberField
            label="Piani, incluso terra"
            value={scenario.totalFloors}
            min={2}
            max={40}
            onChange={(v) => set('totalFloors', v)}
            hint={`Livelli 0–${scenario.totalFloors - 1}`}
          />
        </div>
        {scenario.groups.some((g) => g.floor >= scenario.totalFloors) && (
          <div className="field-warning">
            Alcuni gruppi sono fuori dai nuovi piani.{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                set(
                  'groups',
                  scenario.groups.map((g, i) => ({
                    ...g,
                    floor: (i % Math.max(1, scenario.totalFloors - 1)) + 1,
                  })),
                );
                setNote(
                  'Gruppi ridistribuiti ciclicamente sui piani disponibili; organico conservato.',
                );
              }}
            >
              Ridistribuisci i gruppi
            </button>
          </div>
        )}
        <div className="field-row">
          <NumberField
            label="Capacità per cabina"
            value={scenario.physics.capacityPeople}
            min={1}
            onChange={(v) => phys('capacityPeople', v)}
            unit="persone"
          />
          <NumberField
            label="Portata per cabina"
            value={scenario.physics.capacityKg}
            min={100}
            step={50}
            onChange={(v) => phys('capacityKg', v)}
            unit="kg"
          />
        </div>
        <div className="field-row">
          <NumberField
            label="Addetti complessivi"
            value={total}
            min={0}
            max={2000}
            onChange={(v) => {
              if (Number.isInteger(v) && v >= 0) {
                set('groups', redistributeEmployees(scenario.groups, v));
                setNote(
                  'Organico suddiviso equamente fra i gruppi esistenti. Modifica i singoli gruppi per una distribuzione diversa.',
                );
              }
            }}
          />
          <div className="field-summary">
            <span>Distribuzione</span>
            <strong>{scenario.groups.length} gruppi</strong>
            <small>Modificabili per piano</small>
          </div>
        </div>
        <details className="config-section">
          <summary>
            <span className="section-line">
              <span>02</span>
              <h3>Orari e pause</h3>
              <Icon name="clock" />
            </span>
            <Icon name="plus" />
          </summary>
          <div className="details-body">
            <div className="field-row">
              <TimeField
                label="Ingresso uffici"
                value={scenario.officeStart}
                onChange={(v) => set('officeStart', v)}
              />
              <TimeField
                label="Uscita uffici"
                value={scenario.officeEnd}
                onChange={(v) => set('officeEnd', v)}
              />
            </div>
            <p className="small-note">
              Gli ingressi sono distribuiti attorno all’orario con anticipo medio di{' '}
              {Math.round(-scenario.arrivalOffset / 60)} min; le uscite con ritardo medio di{' '}
              {Math.round(scenario.departureOffset / 60)} min. Dispersioni modificabili nei
              parametri avanzati.
            </p>
            <div className="subsection-title">Applica una pausa a uno o più piani</div>
            <div className="field-row">
              <NumberField
                label="Dal piano"
                value={from}
                min={1}
                max={scenario.totalFloors - 1}
                onChange={setFrom}
              />
              <NumberField
                label="Al piano"
                value={to}
                min={1}
                max={scenario.totalFloors - 1}
                onChange={setTo}
              />
            </div>
            <div className="field-row">
              <TimeField
                label="Inizio pausa"
                value={pause.start}
                onChange={(v) => setPause({ ...pause, start: v })}
              />
              <NumberField
                label="Durata pausa"
                value={pause.duration / 60}
                min={1}
                onChange={(v) => setPause({ ...pause, duration: v * 60 })}
                unit="min"
              />
            </div>
            <NumberField
              label="Partecipazione alla pausa"
              value={pause.participation * 100}
              max={100}
              onChange={(v) => setPause({ ...pause, participation: v / 100 })}
              unit="%"
            />
            <div className="button-pair">
              <button type="button" className="outline-button compact" onClick={() => apply(false)}>
                Sostituisci le pause
              </button>
              <button type="button" className="outline-button compact" onClick={() => apply(true)}>
                Aggiungi pausa <Icon name="plus" size={15} />
              </button>
            </div>
            <p className="small-note">
              Per piano o gruppo di piani. Le pause aggiunte sono componenti distinte;
              sovrapposizioni nello stesso gruppo impediscono l’avvio.
            </p>
            {group && (
              <>
                <div className="subsection-title">Personalizza un singolo gruppo</div>
                <label className="field">
                  <span>Gruppo / ufficio</span>
                  <select value={group.id} onChange={(e) => setSelected(e.target.value)}>
                    {scenario.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · P{g.floor} · {g.employees} addetti
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field-row">
                  <NumberField
                    label="Piano del gruppo"
                    value={group.floor}
                    min={1}
                    max={scenario.totalFloors - 1}
                    onChange={(v) => editGroup({ ...group, floor: v })}
                  />
                  <NumberField
                    label="Addetti del gruppo"
                    value={group.employees}
                    onChange={(v) => editGroup({ ...group, employees: v })}
                  />
                </div>
                {group.breaks.map((b, i) => (
                  <div className="break-card" key={b.id}>
                    <div className="break-heading">
                      <span>PAUSA {i + 1}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Elimina pausa ${i + 1}`}
                        onClick={() =>
                          editGroup({ ...group, breaks: group.breaks.filter((x) => x.id !== b.id) })
                        }
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </div>
                    <div className="field-row">
                      <TimeField
                        label={`Inizio pausa ${i + 1}`}
                        value={b.start}
                        onChange={(v) =>
                          editGroup({
                            ...group,
                            breaks: group.breaks.map((x) =>
                              x.id === b.id ? { ...x, start: v } : x,
                            ),
                          })
                        }
                      />
                      <NumberField
                        label={`Durata pausa ${i + 1}`}
                        value={b.duration / 60}
                        min={1}
                        unit="min"
                        onChange={(v) =>
                          editGroup({
                            ...group,
                            breaks: group.breaks.map((x) =>
                              x.id === b.id ? { ...x, duration: v * 60 } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <NumberField
                      label={`Partecipazione pausa ${i + 1}`}
                      value={b.participation * 100}
                      max={100}
                      unit="%"
                      onChange={(v) =>
                        editGroup({
                          ...group,
                          breaks: group.breaks.map((x) =>
                            x.id === b.id ? { ...x, participation: v / 100 } : x,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    editGroup({
                      ...group,
                      breaks: [...group.breaks, { ...pause, id: `pausa-${Date.now()}` }],
                    })
                  }
                >
                  + Aggiungi pausa al gruppo
                </button>
                <div className="button-pair group-actions">
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      const id = `gruppo-${Date.now()}`;
                      set('groups', [
                        ...scenario.groups,
                        {
                          id,
                          name: `Gruppo ${scenario.groups.length + 1}`,
                          floor: from >= 1 && from < scenario.totalFloors ? from : 1,
                          employees: 0,
                          breaks: [{ ...pause }],
                        },
                      ]);
                      setSelected(id);
                    }}
                  >
                    + Nuovo gruppo
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      set(
                        'groups',
                        scenario.groups.filter((g) => g.id !== group.id),
                      );
                      setNote(
                        'Gruppo rimosso: i suoi addetti non sono stati trasferiti automaticamente.',
                      );
                    }}
                  >
                    Rimuovi gruppo
                  </button>
                </div>
              </>
            )}
          </div>
        </details>
        <details className="config-section">
          <summary>
            <span className="section-line">
              <span>03</span>
              <h3>Parametri del modello</h3>
              <Icon name="settings" />
            </span>
            <Icon name="plus" />
          </summary>
          <div className="details-body">
            <div className="field-row">
              <NumberField
                label="Velocità"
                value={scenario.physics.speed}
                min={0.1}
                step={0.1}
                onChange={(v) => phys('speed', v)}
                unit="m/s"
              />
              <NumberField
                label="Accelerazione"
                value={scenario.physics.acceleration}
                min={0.1}
                step={0.1}
                onChange={(v) => phys('acceleration', v)}
                unit="m/s²"
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Altezza interpiano"
                value={scenario.physics.floorHeight}
                min={0.1}
                step={0.1}
                onChange={(v) => phys('floorHeight', v)}
                unit="m"
              />
              <NumberField
                label="Porta base"
                value={scenario.physics.doorTime}
                step={0.1}
                onChange={(v) => phys('doorTime', v)}
                unit="s"
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Trasferimento / persona"
                value={scenario.physics.transferTime}
                step={0.1}
                onChange={(v) => phys('transferTime', v)}
                unit="s"
              />
              <NumberField
                label="Riserva / chiamata"
                value={scenario.physics.reserveKg}
                min={1}
                onChange={(v) => phys('reserveKg', v)}
                unit="kg"
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Massa media"
                value={scenario.physics.weightMean}
                min={1}
                onChange={(v) => phys('weightMean', v)}
                unit="kg"
              />
              <NumberField
                label="Deviazione della massa"
                value={scenario.physics.weightSigma}
                min={0.1}
                step={0.1}
                onChange={(v) => phys('weightSigma', v)}
                unit="kg"
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Massa minima"
                value={scenario.physics.weightMin}
                min={1}
                onChange={(v) => phys('weightMin', v)}
                unit="kg"
              />
              <NumberField
                label="Massa massima"
                value={scenario.physics.weightMax}
                min={1}
                onChange={(v) => phys('weightMax', v)}
                unit="kg"
              />
            </div>
            <NumberField
              label="Frazione di carico pianificato"
              value={scenario.physics.loadFraction * 100}
              min={1}
              max={100}
              onChange={(v) => phys('loadFraction', v / 100)}
              unit="%"
            />
            <div className="field-row">
              <NumberField
                label="Dispersione ingressi"
                value={scenario.arrivalSigma / 60}
                min={0.1}
                step={0.1}
                onChange={(v) => set('arrivalSigma', v * 60)}
                unit="min"
              />
              <NumberField
                label="Dispersione uscite"
                value={scenario.departureSigma / 60}
                min={0.1}
                step={0.1}
                onChange={(v) => set('departureSigma', v * 60)}
                unit="min"
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Offset medio ingresso"
                value={scenario.arrivalOffset / 60}
                min={-60}
                onChange={(v) => set('arrivalOffset', v * 60)}
                unit="min"
              />
              <NumberField
                label="Offset medio uscita"
                value={scenario.departureOffset / 60}
                min={-60}
                onChange={(v) => set('departureOffset', v * 60)}
                unit="min"
              />
            </div>
            <NumberField
              label="Probabilità viaggio interno"
              value={scenario.internalProbability * 100}
              max={100}
              onChange={(v) => set('internalProbability', v / 100)}
              unit="%"
            />
            <div className="field-row">
              <TimeField
                label="Inizio simulazione"
                value={scenario.horizonStart}
                onChange={(v) => set('horizonStart', v)}
              />
              <TimeField
                label="Fine simulazione"
                value={scenario.horizonEnd}
                onChange={(v) => set('horizonEnd', v)}
              />
            </div>
            <p className="small-note">
              ρ, riserva e vincoli sono distinti. Gli orari oltre mezzanotte sono fuori dal modello.
              Se una richiesta non è servita entro la fine, resta visibile come incompleta.
            </p>
          </div>
        </details>
        <div className="experiment-options">
          <label className="field">
            <span>Repliche</span>
            <select value={scenario.replicas} onChange={(e) => set('replicas', +e.target.value)}>
              <option value="1">1 · Esplorazione rapida</option>
              <option value="8">8 · Confronto statistico</option>
            </select>
          </label>
          <NumberField label="Seed" value={scenario.seed} onChange={(v) => set('seed', v)} />
        </div>
      </fieldset>
      {note && (
        <p className="configuration-note" role="status">
          {note}
        </p>
      )}
      {errors.length > 0 && (
        <div className="form-errors" role="alert">
          <strong>Controlla lo scenario</strong>
          <ul>
            {errors.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {errors.length > 8 && <p>Altri {errors.length - 8} parametri non validi.</p>}
        </div>
      )}
      <div className="run-controls">
        {running ? (
          <>
            <div className="run-progress">
              <span>{progressLabel}</span>
              <strong>{Math.round(progress * 100)}%</strong>
              <progress max="1" value={progress} />
            </div>
            <button className="outline-button" onClick={onCancel}>
              Annulla simulazione <Icon name="close" />
            </button>
          </>
        ) : (
          <button className="primary-button run-button" onClick={onRun}>
            Avvia simulazione <Icon name="arrow" />
          </button>
        )}
        <p className="run-caption">
          Tre politiche. Stesse richieste. Risultati calcolati nel tuo browser.
        </p>
        <button
          className="reset-button"
          type="button"
          disabled={running}
          onClick={() => {
            onChange(structuredClone(DEFAULT_SCENARIO));
            setSelected('U12-FOCUS');
            setNote('Ripristinato il caso illustrativo del PDF: 30 uffici, 525 addetti.');
          }}
        >
          Ripristina lo scenario del PDF
        </button>
      </div>
      <p className="small-note resource-note">
        Fino a 8 cabine, 40 piani e 2.000 addetti. Limite 14.000 richieste per replica; 30 s per
        politica. Gli esperimenti oltre i limiti sono interrotti esplicitamente.
      </p>
    </div>
  );
}
