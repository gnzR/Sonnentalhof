import React, { useRef, useState } from 'react';
import {
  Download,
  Info,
  Keyboard,
  Monitor,
  Music,
  Play,
  RotateCcw,
  Save,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { MIDI_TRACKS } from '../audio/midiEngine';
import { APP_DEVELOPER, APP_VERSION_LABEL, DEFAULT_SETTINGS } from '../data/catalog';
import { GameSettings, GraphicsQuality, KeybindSettings, ResolutionPreset } from '../types/game';
import { isDesktopClient } from '../utils/runtimeEnv';
import { DesktopDownloadsCard } from './DesktopDownloadsCard';

interface OptionsModalProps {
  settings: GameSettings;
  defaultSaveName?: string;
  lastSavedAt?: number;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
  onManualSave: () => void;
  onExportSave: (customFileName: string) => void;
  onImportSave: (jsonText: string) => void;
  onResetGame: () => void;
}

const KEYBIND_LABELS: { key: keyof KeybindSettings; label: string }[] = [
  { key: 'toolHand', label: 'Werkzeug: Ernten / Hand' },
  { key: 'toolHoe', label: 'Werkzeug: Acker anlegen' },
  { key: 'toolWater', label: 'Werkzeug: Gießen' },
  { key: 'toolFertilize', label: 'Werkzeug: Düngen' },
  { key: 'toolPlant', label: 'Werkzeug: Säen' },
  { key: 'toolBuild', label: 'Werkzeug: Bau (Deko)' },
  { key: 'toolRemove', label: 'Werkzeug: Räumen' },
  { key: 'openMarket', label: 'Bauernmarkt öffnen' },
  { key: 'openNeighbors', label: 'Nachbarschaft öffnen' },
  { key: 'openEvents', label: 'Saison-Event öffnen' },
  { key: 'openAvatar', label: 'Avatar-Generator öffnen' },
  { key: 'openOptions', label: 'Optionen öffnen' },
  { key: 'toggleMusic', label: 'Musik An / Aus' },
];

export const OptionsModal: React.FC<OptionsModalProps> = ({
  settings,
  defaultSaveName = 'sonnental-hof',
  lastSavedAt,
  onUpdateSettings,
  onClose,
  onManualSave,
  onExportSave,
  onImportSave,
  onResetGame,
}) => {
  const [tab, setTab] = useState<'display' | 'audio' | 'controls' | 'save' | 'info'>('display');
  const [listeningKey, setListeningKey] = useState<keyof KeybindSettings | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveFileName, setSaveFileName] = useState(defaultSaveName);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopClient = isDesktopClient();

  const handleKeyCapture = (e: React.KeyboardEvent, keyName: keyof KeybindSettings) => {
    e.preventDefault();
    e.stopPropagation();
    const pressed = e.key.toLowerCase();
    if (pressed === 'escape') {
      setListeningKey(null);
      return;
    }
    onUpdateSettings({
      ...settings,
      keybinds: {
        ...settings.keybinds,
        [keyName]: pressed === ' ' ? 'space' : pressed,
      },
    });
    setListeningKey(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportSave(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div>
            <h2 className="font-display text-xl font-bold">Optionen & Einstellungen</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Auflösung, ruhige MIDI-Hintergrundmusik, Tastatur-Shortcuts & lokaler Spielstand
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Optionen schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <button
            onClick={() => setTab('display')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'display' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Auflösung & Grafik</span>
          </button>
          <button
            onClick={() => setTab('audio')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'audio' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Sound & Musik</span>
          </button>
          <button
            onClick={() => setTab('controls')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'controls' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Tastatur-Shortcuts</span>
          </button>
          <button
            onClick={() => setTab('save')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'save' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{desktopClient ? 'Speicherstand' : 'Speicherstand & Desktop'}</span>
          </button>
          <button
            onClick={() => setTab('info')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'info' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Info</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'display' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display font-bold text-base mb-1">Render-Auflösung (Pixel-Art-Skalierung)</h3>
                <p className="text-xs text-[#5c4632] mb-3">
                  Wähle die interne Pixel-Canvas-Auflösung passend zu deinem Monitor (Windows 10/11 oder CachyOS).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: '720p', title: '720p HD', desc: '1280 × 720 · Kompakt & ressourcenschonend' },
                      { id: '1080p', title: '1080p Full HD', desc: '1920 × 1080 · Ausgewogene Pixel-Schärfe' },
                      { id: '2160p', title: '2160p 4K UHD', desc: '3840 × 2160 · Maximale Schärfe für große Monitore' },
                    ] as { id: ResolutionPreset; title: string; desc: string }[]
                  ).map((opt) => {
                    const active = settings.resolution === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => onUpdateSettings({ ...settings, resolution: opt.id })}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          active
                            ? 'bg-emerald-700 text-white border-emerald-900'
                            : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                        }`}
                      >
                        <div className="font-display font-bold text-base">{opt.title}</div>
                        <div className={`text-xs mt-1 ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-base mb-1">Grafik-Qualität (Licht, Schatten &amp; Details)</h3>
                <p className="text-xs text-[#5c4632] mb-3">
                  Wähle zwischen dem ressourcenschonenden Klassik-Modus oder dem erweiterten Grafik-Profil mit Echtzeit-Schatten und Effekten.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'standard',
                        title: 'Standard (Klassisch)',
                        desc: 'Ohne dynamische Schatten, Nacht-Lichtmaske & Zusatzpartikel — maximal ressourcenschonend.',
                      },
                      {
                        id: 'high',
                        title: 'Hoch (Empfohlen)',
                        desc: 'Echtzeit-Bodenschatten, weiche Bodenübergänge, Nacht-Lichtkegel, Wind- & Aktions-Partikel.',
                      },
                    ] as { id: GraphicsQuality; title: string; desc: string }[]
                  ).map((opt) => {
                    const active = (settings.graphicsQuality ?? 'high') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => onUpdateSettings({ ...settings, graphicsQuality: opt.id })}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          active
                            ? 'bg-emerald-700 text-white border-emerald-900'
                            : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                        }`}
                      >
                        <div className="font-display font-bold text-base">{opt.title}</div>
                        <div className={`text-xs mt-1 ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-3">
                <h4 className="font-display font-bold text-sm">Anzeige-Hilfen</h4>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Rasterlinien auf freigeschalteten Feldern anzeigen</span>
                  <input
                    type="checkbox"
                    checked={settings.showGrid}
                    onChange={(e) => onUpdateSettings({ ...settings, showGrid: e.target.checked })}
                    className="w-4 h-4 accent-emerald-700"
                  />
                </label>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Feld-Info & Restzeit beim Überfahren einblenden</span>
                  <input
                    type="checkbox"
                    checked={settings.showTimers}
                    onChange={(e) => onUpdateSettings({ ...settings, showTimers: e.target.checked })}
                    className="w-4 h-4 accent-emerald-700"
                  />
                </label>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base">Lautstärke-Regler</h3>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.muted}
                      onChange={(e) => onUpdateSettings({ ...settings, muted: e.target.checked })}
                      className="w-4 h-4 accent-rose-700"
                    />
                    Alles stummschalten
                  </label>
                </div>

                <label className="block text-xs font-semibold">
                  <div className="flex justify-between mb-1">
                    <span>Gesamtlautstärke</span>
                    <span className="font-mono-num">{Math.round(settings.masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.masterVolume}
                    onChange={(e) => onUpdateSettings({ ...settings, masterVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-700"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  <div className="flex justify-between mb-1">
                    <span>Hintergrundmusik (MIDI-Synthesizer)</span>
                    <span className="font-mono-num">{Math.round(settings.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.musicVolume}
                    onChange={(e) => onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-700"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  <div className="flex justify-between mb-1">
                    <span>Soundeffekte (Ernte, Wasser, Münzen)</span>
                    <span className="font-mono-num">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.sfxVolume}
                    onChange={(e) => onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-700"
                  />
                </label>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base">Ruhige MIDI-Titelauswahl ({MIDI_TRACKS.length} Stücke)</h3>
                  <button
                    onClick={() => onUpdateSettings({ ...settings, musicPlaying: !settings.musicPlaying })}
                    className="px-3 py-1.5 rounded-lg bg-[#4a321f] text-white text-xs font-semibold"
                  >
                    {settings.musicPlaying ? 'Musik pausieren' : 'Musik starten'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MIDI_TRACKS.map((track, idx) => {
                    const active = settings.currentTrackIndex === idx && settings.musicPlaying;
                    return (
                      <button
                        key={track.id}
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            currentTrackIndex: idx,
                            musicPlaying: true,
                            muted: false,
                          })
                        }
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'bg-emerald-700 text-white border-emerald-900'
                            : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 shrink-0" />
                            <span>{track.title}</span>
                          </div>
                          <div className={`text-xs mt-0.5 ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                            {track.mood} · {track.bpm} BPM
                          </div>
                        </div>
                        <Play className="w-4 h-4 shrink-0 opacity-80" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base">Tastatur-Shortcuts anpassen</h3>
                  <p className="text-xs text-[#5c4632]">
                    Klicke auf eine Taste und drücke die gewünschte neue Taste. Bewegung der Figur: WASD oder Pfeiltasten.
                  </p>
                </div>
                <button
                  onClick={() => onUpdateSettings({ ...settings, keybinds: DEFAULT_SETTINGS.keybinds })}
                  className="px-3 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-xs font-semibold"
                >
                  Standard wiederherstellen
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {KEYBIND_LABELS.map(({ key, label }) => {
                  const isListening = listeningKey === key;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#d6c7ae]"
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <button
                        onClick={() => setListeningKey(key)}
                        onKeyDown={(e) => isListening && handleKeyCapture(e, key)}
                        className={`min-w-[68px] px-3 py-1.5 rounded-lg font-mono-num text-xs font-bold uppercase transition-colors ${
                          isListening
                            ? 'bg-amber-600 text-white'
                            : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e2d3ba]'
                        }`}
                      >
                        {isListening ? 'Taste...' : settings.keybinds[key]}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'save' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base">Lokaler Spielstand (100% Offline)</h3>
                  <span className="text-xs font-mono-num text-[#5c4632]">
                    Auto-Save: alle 15 Min.
                    {lastSavedAt ? ` · Zuletzt: ${new Date(lastSavedAt).toLocaleTimeString('de-DE')}` : ''}
                  </span>
                </div>
                <p className="text-xs text-[#5c4632] leading-relaxed">
                  Dein Spielfortschritt wird automatisch alle 15 Minuten (und beim Beenden) lokal gespeichert. Zusätzlich kannst du jederzeit einen Spielstand unter beliebigem Dateinamen als <code>.json</code> sichern oder andere Savegames laden.
                </p>

                <div className="p-3 rounded-xl bg-[#faf6ee] border border-[#d6c7ae] space-y-2.5">
                  <label className="block text-xs font-semibold">
                    Dateiname zum Speichern (ohne .json)
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <input
                        type="text"
                        maxLength={50}
                        value={saveFileName}
                        onChange={(e) => setSaveFileName(e.target.value)}
                        placeholder="z.B. mein-bauernhof-herbst"
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white border border-[#cbb99d] text-sm font-medium focus:outline-2 focus:outline-emerald-700"
                      />
                      <button
                        onClick={() => onExportSave(saveFileName)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] text-white text-xs font-semibold whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        <span>Savegame speichern (.json)</span>
                      </button>
                    </div>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={onManualSave}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    <span>Sofort lokal zwischenspeichern</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-[#2b2118] text-xs font-semibold"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Anderes Savegame laden (.json)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              </div>

              {!desktopClient && (
                <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-3">
                  <h3 className="font-display font-bold text-sm">Desktop-Paket für Windows 10/11 (.exe) & CachyOS (Linux)</h3>
                  <p className="text-xs text-[#5c4632] leading-relaxed">
                    Im Projektordner liegen fertige Electron-Konfigurationen (<code>electron/main.cjs</code> & <code>electron-builder.json</code>). Mit <code>npm run desktop:win</code> bzw. <code>npm run desktop:linux</code> erstellst du direkt ausführbare Windows-<code>.exe</code>-Installer sowie Linux-<code>tar.gz</code>-Pakete für CachyOS ohne Online-Zwang.
                  </p>
                  <DesktopDownloadsCard compact />
                </div>
              )}

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-sm text-rose-900">Neuen Hof beginnen</div>
                  <div className="text-xs text-rose-800">Löscht den aktuellen lokalen Spielstand unwiderruflich.</div>
                </div>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Spielstand zurücksetzen</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 rounded-lg bg-white border border-rose-300 text-xs font-semibold"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        setConfirmReset(false);
                        onResetGame();
                      }}
                      className="px-4 py-2 rounded-lg bg-rose-700 text-white text-xs font-semibold"
                    >
                      Ja, neu starten
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white border border-[#d6c7ae] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece2d0] pb-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#2b2118]">Sonnental Hof</h3>
                    <p className="text-xs text-[#5c4632]">
                      Gemütlicher 2D-Pixel-Bauernhof · Komplett offline spielbar
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-mono-num text-xs font-bold">
                    {APP_VERSION_LABEL}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
                    <div className="text-xs text-[#6e4a2e] font-semibold">Entwickler</div>
                    <div className="font-display font-bold text-base text-[#2b2118] mt-0.5">
                      {APP_DEVELOPER}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
                    <div className="text-xs text-[#6e4a2e] font-semibold">Versionsnummer</div>
                    <div className="font-display font-bold text-base text-[#2b2118] mt-0.5">
                      {APP_VERSION_LABEL}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f5efe3] border border-[#d6c7ae] text-xs text-[#5c4632] space-y-1.5 leading-relaxed">
                  <div className="font-display font-bold text-[#2b2118]">Neu in {APP_VERSION_LABEL}:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Nördliches <strong>Sonnental-Dorf</strong> (30 unterschiedliche Wohnhäuser mit je 2–3 Bewohnern) samt <strong>Schwarzem Brett am Dorfplatz</strong> (+48 % Lieferbonus &amp; Ruf) sowie Wegenetz zum <strong>Hofladen</strong> mit bis zu 50 täglichen Besuchern.</li>
                    <li><strong>Alte Waldmine &amp; Kristallhöhle</strong> am westlichen Talrand: 6 Erze, 6 Höhlen-Relikte, Spitzhacken-Upgrades und Kristallschmiede für <strong>Kupfer-/Mondstein-Sprinkler</strong> &amp; Leuchtdeko.</li>
                    <li><strong>Winter-Gewächshaus (ab Hof-Level 18)</strong> auf dem Markt oder vergünstigt in der Minen-Schmiede: erzeugt eine 5×5 frostfreie <strong>Wärmezone (+25 % Tempo)</strong> für alle Saaten im Winter.</li>
                    <li><strong>Winter-Highlights</strong>: Am 1. Wintertag um 20:00 Uhr bringt der <strong>Weihnachtsmann</strong> mit seinen Rentieren exklusive Weihnachts-Deko als Geschenk, und am 2. Wintertag um 23:59 Uhr steigt ein großes <strong>Silvester-Feuerwerk</strong>.</li>
                    <li>Getrennte Werkzeuge für <strong>Säen</strong> (nur Saatgut) und <strong>Bau</strong> (nur Deko-Sachen) im Aktionsmenü.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
