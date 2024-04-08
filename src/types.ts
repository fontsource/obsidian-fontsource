interface BaseMetadata {
	id: string;
	family: string;
	subsets: string[];
	styles: string[];
	weights: number[];
	variable?: {
		wght?: { min: number; max: number };
		stretch?: { min: number; max: number };
		slnt?: { min: number; max: number };
	};
}

interface SettingsMetadata extends BaseMetadata {
	isActive: boolean;
}

interface SettingsPrecedence {
	family: string;
	id: string;
	precedence: number;
}

interface FontMetadata extends BaseMetadata {
	// subset-weight-style -> base64
	base64: Record<string, string>;
	// subset -> unicode range
	unicodeRange: Record<string, string>;
}

type FontType = 'interface' | 'text' | 'monospace';

export type { SettingsMetadata, SettingsPrecedence, FontMetadata, FontType };
