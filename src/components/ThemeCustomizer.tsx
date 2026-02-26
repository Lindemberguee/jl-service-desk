import { useState } from 'react';
import { usePersonalTheme, THEME_PRESETS, type ThemePreset } from '@/hooks/usePersonalTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Palette, Check, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ThemeCustomizer() {
  const { currentPresetId, setTheme, setCustomColors, currentTheme } = usePersonalTheme();
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customPrimary, setCustomPrimary] = useState(currentTheme?.primary || '#3B82F6');
  const [customSidebar, setCustomSidebar] = useState(currentTheme?.sidebar || '#1E293B');

  const handlePreset = (preset: ThemePreset) => {
    setTheme(preset);
    setCustomMode(false);
  };

  const handleReset = () => {
    setTheme(null);
    setCustomMode(false);
  };

  const handleCustomApply = () => {
    setCustomColors(customPrimary, customPrimary, customSidebar);
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
        <div className="p-4 space-y-4">
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
                      <div
                        className="h-8 w-8 rounded-lg shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${preset.sidebar} 50%, ${preset.primary} 50%)`,
                        }}
                      />
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
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
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Palette className="h-3 w-3" />
              {customMode ? 'Ocultar personalização avançada' : 'Cores personalizadas'}
            </button>

            {customMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimary}
                      onChange={e => setCustomPrimary(e.target.value)}
                      className="w-8 h-8 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={customPrimary}
                      onChange={e => setCustomPrimary(e.target.value)}
                      className="h-8 w-24 font-mono text-xs"
                      maxLength={7}
                    />
                    <div className="flex-1 h-6 rounded" style={{ backgroundColor: customPrimary }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fundo do Menu</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customSidebar}
                      onChange={e => setCustomSidebar(e.target.value)}
                      className="w-8 h-8 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={customSidebar}
                      onChange={e => setCustomSidebar(e.target.value)}
                      className="h-8 w-24 font-mono text-xs"
                      maxLength={7}
                    />
                    <div className="flex-1 h-6 rounded" style={{ backgroundColor: customSidebar }} />
                  </div>
                </div>

                <Button size="sm" className="w-full h-8 text-xs" onClick={handleCustomApply}>
                  <Check className="h-3 w-3 mr-1.5" />
                  Aplicar Cores
                </Button>
              </motion.div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="rounded-lg overflow-hidden border border-border flex h-12">
              <div
                className="w-12 flex items-center justify-center"
                style={{ backgroundColor: currentTheme?.sidebar || '#1E293B' }}
              >
                <div
                  className="h-5 w-5 rounded-md"
                  style={{ backgroundColor: currentTheme?.primary || '#3B82F6' }}
                />
              </div>
              <div className="flex-1 bg-background flex items-center px-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-12 rounded-sm"
                    style={{ backgroundColor: currentTheme?.primary || '#3B82F6' }}
                  />
                  <div className="h-3 w-20 rounded-sm bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
