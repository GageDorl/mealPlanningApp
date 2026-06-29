export type TooltipData = {
  step: number;
  total: number;
  title: string;
  body: string;
  relativeY: number;
  centerX: number;
  onNext: () => void;
  onDismiss: () => void;
};

export type InfoSlide = {
  type: 'info';
  title: string;
  body: string;
  illustrationKey?: string;
};

export type ActionSlide = {
  type: 'action';
  title: string;
  body: string;
  componentKey: string;
  skippable?: boolean;
};

export type TutorialSlide = InfoSlide | ActionSlide;

export interface TutorialChapter {
  id: string;
  title: string;
  icon: string;
  estimatedMinutes: number;
  slides: TutorialSlide[];
}
