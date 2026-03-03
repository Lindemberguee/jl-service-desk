import { useState, useEffect } from 'react';
import { usePersonalTheme, THEME_PRESETS, type ThemePreset } from '@/hooks/usePersonalTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Palette, Check, RotateCcw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
          />
        </div>
        <Input
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '#') onChange(v);
          }}
          className="h-9 w-24 font-mono text-xs uppercase"
          maxLength={7}
        />
        <div className="flex-1 h-7 rounded-md border border-border/50 shadow-inner" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

export function ThemeCustomizer() {
  const { currentPresetId, setTheme, setCustomColors, currentTheme } = usePersonalTheme();
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(currentPresetId === 'custom');
  const [customPrimary, setCustomPrimary] = useState(currentTheme?.primary || '#3B82F6');
  const [customAccent, setCustomAccent] = useState(currentTheme?.accent || '#8B5CF6');
  const [customSidebar, setCustomSidebar] = useState(currentTheme?.sidebar || '#1E293B');

  // Sync custom fields when theme changes externally (preset click)
  useEffect(() => {
    if (currentTheme) {
      setCustomPrimary(currentTheme.primary);
      setCustomAccent(currentTheme.accent);
      setCustomSidebar(currentTheme.sidebar);
    }
  }, [currentTheme]);

  const handlePreset = (preset: ThemePreset) => {
    setTheme(preset);
    setCustomMode(false);
  };

  const handleReset = () => {
    setTheme(null);
    setCustomMode(false);
  };

  const handleCustomApply = () => {
    setCustomColors(customPrimary, customAccent, customSidebar);
  };

  // Live preview on custom color changes
  const handleLiveUpdate = (primary: string, accent: string, sidebar: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(primary) && /^#[0-9a-fA-F]{6}$/.test(accent) && /^#[0-9a-fA-F]{6}$/.test(sidebar)) {
      setCustomColors(primary, accent, sidebar);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative group">
              <Palette className="h-4 w-4" />
              {currentPresetId !== 'default' && currentTheme && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card"
                  style={{ backgroundColor: currentTheme.primary }}
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Personalizar tema</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Tema Pessoal</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
              Padrão
            </Button>
          </div>

          {/* Presets grid */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Temas Prontos</Label>
            <div className="grid grid-cols-4 gap-2">
              {THEME_PRESETS.map((preset) => {
                const isActive = currentPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-200 hover:scale-105",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg shadow-inner overflow-hidden flex">
                        <div className="w-1/2 h-full" style={{ backgroundColor: preset.sidebar }} />
                        <div className="w-1/2 h-full flex flex-col">
                          <div className="h-1/2" style={{ backgroundColor: preset.primary }} />
                          <div className="h-1/2" style={{ backgroundColor: preset.accent }} />
                        </div>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg"
                        >
                          <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                        </motion.div>
                      )}
                    </div>
                    <span className="text-[9px] font-medium leading-tight text-center">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom colors toggle */}
          <div className="space-y-2">
            <button
              onClick={() => setCustomMode(!customMode)}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <Palette className="h-3 w-3" />
              Cores personalizadas
              {customMode ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
              {customMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 overflow-hidden"
                >
                  <ColorPicker
                    label="Cor Primária"
                    value={customPrimary}
                    onChange={v => {
                      setCustomPrimary(v);
                      handleLiveUpdate(v, customAccent, customSidebar);
                    }}
                  />

                  <ColorPicker
                    label="Cor de Destaque"
                    value={customAccent}
                    onChange={v => {
                      setCustomAccent(v);
                      handleLiveUpdate(customPrimary, v, customSidebar);
                    }}
                  />

                  <ColorPicker
                    label="Fundo do Menu Lateral"
                    value={customSidebar}
                    onChange={v => {
                      setCustomSidebar(v);
                      handleLiveUpdate(customPrimary, customAccent, v);
                    }}
                  />

                  <Button size="sm" className="w-full h-8 text-xs" onClick={handleCustomApply}>
                    <Check className="h-3 w-3 mr-1.5" />
                    Aplicar Cores
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhanced Preview */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="rounded-lg overflow-hidden border border-border bg-background shadow-sm">
              <div className="flex h-20">
                {/* Sidebar preview */}
                <div
                  className="w-14 flex flex-col items-center pt-2 gap-1.5 border-r"
                  style={{
                    backgroundColor: currentTheme?.sidebar || '#1E293B',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="h-5 w-5 rounded-md"
                    style={{ backgroundColor: currentTheme?.primary || '#3B82F6' }}
                  />
                  <div className="h-1.5 w-7 rounded-full bg-white/15" />
                  <div className="h-1.5 w-7 rounded-full bg-white/10" />
                  <div className="h-1.5 w-7 rounded-full bg-white/10" />
                </div>
                {/* Main area */}
                <div className="flex-1 flex flex-col p-2 gap-1.5">
                  {/* Top bar */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-14 rounded-sm"
                      style={{ backgroundColor: currentTheme?.primary || '#3B82F6' }}
                    />
                    <div className="h-3 w-8 rounded-sm bg-muted" />
                    <div className="flex-1" />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: currentTheme?.accent || '#8B5CF6' }}
                    />
                  </div>
                  {/* Cards */}
                  <div className="flex gap-1.5 flex-1">
                    <div className="flex-1 rounded-sm bg-card border border-border flex items-center justify-center">
                      <div
                        className="h-4 w-4 rounded-sm opacity-60"
                        style={{ backgroundColor: currentTheme?.primary || '#3B82F6' }}
                      />
                    </div>
                    <div className="flex-1 rounded-sm bg-card border border-border flex items-center justify-center">
                      <div
                        className="h-4 w-4 rounded-sm opacity-60"
                        style={{ backgroundColor: currentTheme?.accent || '#8B5CF6' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
