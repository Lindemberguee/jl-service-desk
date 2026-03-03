import { useState, useEffect } from 'react';
import { usePersonalTheme, THEME_PRESETS, type ThemePreset, type SavedTheme } from '@/hooks/usePersonalTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Check, RotateCcw, Sparkles, ChevronDown, ChevronUp, Save, Trash2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

function ThemePreview({ primary, accent, sidebar }: { primary: string; accent: string; sidebar: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-background shadow-sm">
      <div className="flex h-16">
        <div
          className="w-12 flex flex-col items-center pt-1.5 gap-1 border-r"
          style={{ backgroundColor: sidebar, borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="h-4 w-4 rounded-md" style={{ backgroundColor: primary }} />
          <div className="h-1 w-6 rounded-full bg-white/15" />
          <div className="h-1 w-6 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 flex flex-col p-1.5 gap-1">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-10 rounded-sm" style={{ backgroundColor: primary }} />
            <div className="flex-1" />
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          </div>
          <div className="flex gap-1 flex-1">
            <div className="flex-1 rounded-sm bg-card border border-border flex items-center justify-center">
              <div className="h-3 w-3 rounded-sm opacity-50" style={{ backgroundColor: primary }} />
            </div>
            <div className="flex-1 rounded-sm bg-card border border-border flex items-center justify-center">
              <div className="h-3 w-3 rounded-sm opacity-50" style={{ backgroundColor: accent }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeCustomizer() {
  const {
    currentPresetId, setTheme, setCustomColors, currentTheme,
    savedThemes, saveTheme, removeSavedTheme, applySavedTheme,
  } = usePersonalTheme();
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(currentPresetId === 'custom');
  const [customPrimary, setCustomPrimary] = useState(currentTheme?.primary || '#3B82F6');
  const [customAccent, setCustomAccent] = useState(currentTheme?.accent || '#8B5CF6');
  const [customSidebar, setCustomSidebar] = useState(currentTheme?.sidebar || '#1E293B');
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

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

  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  const handleLiveUpdate = (primary: string, accent: string, sidebar: string) => {
    if (isValidHex(primary) && isValidHex(accent) && isValidHex(sidebar)) {
      setCustomColors(primary, accent, sidebar);
    }
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error('Digite um nome para o tema');
      return;
    }
    saveTheme(saveName.trim());
    toast.success(`Tema "${saveName.trim()}" salvo!`);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleDeleteSaved = (saved: SavedTheme) => {
    removeSavedTheme(saved.id);
    toast.success(`Tema "${saved.name}" removido`);
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

      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
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

          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="w-full h-8 grid grid-cols-3">
              <TabsTrigger value="presets" className="text-xs h-7">Temas</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs h-7">Personalizar</TabsTrigger>
              <TabsTrigger value="saved" className="text-xs h-7 gap-1">
                <Heart className="h-3 w-3" />
                Meus ({savedThemes.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Presets tab ── */}
            <TabsContent value="presets" className="mt-3 space-y-3">
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
            </TabsContent>

            {/* ── Custom tab ── */}
            <TabsContent value="custom" className="mt-3 space-y-3">
              <ColorPicker
                label="Cor Primária (botões, links, destaques)"
                value={customPrimary}
                onChange={v => {
                  setCustomPrimary(v);
                  handleLiveUpdate(v, customAccent, customSidebar);
                }}
              />

              <ColorPicker
                label="Cor de Destaque (hover, badges, gráficos)"
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

              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleLiveUpdate(customPrimary, customAccent, customSidebar)}
              >
                <Check className="h-3 w-3 mr-1.5" />
                Aplicar Cores
              </Button>

              {/* Save current theme */}
              {currentTheme && (
                <div className="pt-2 border-t border-border">
                  {!showSaveInput ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                      onClick={() => setShowSaveInput(true)}
                    >
                      <Save className="h-3 w-3" />
                      Salvar como "Meu Tema"
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <Input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder="Nome do tema..."
                        className="h-8 text-xs flex-1"
                        maxLength={20}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={handleSave}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── Saved themes tab ── */}
            <TabsContent value="saved" className="mt-3 space-y-3">
              {savedThemes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhum tema salvo ainda.</p>
                  <p className="text-[10px] mt-1">Vá em "Personalizar" e salve suas combinações favoritas!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedThemes.map((saved) => {
                    const isActive = currentPresetId === saved.id;
                    return (
                      <motion.div
                        key={saved.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "rounded-lg border p-2.5 space-y-2 transition-all cursor-pointer",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                        onClick={() => applySavedTheme(saved)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              <div className="h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: saved.primary }} />
                              <div className="h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: saved.accent }} />
                              <div className="h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: saved.sidebar }} />
                            </div>
                            <span className="text-xs font-medium">{saved.name}</span>
                            {isActive && <Check className="h-3 w-3 text-primary" />}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSaved(saved);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview */}
          <div className="space-y-1.5 pt-1 border-t border-border">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <ThemePreview
              primary={currentTheme?.primary || '#3B82F6'}
              accent={currentTheme?.accent || '#8B5CF6'}
              sidebar={currentTheme?.sidebar || '#1E293B'}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
