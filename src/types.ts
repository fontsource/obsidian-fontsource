interface SettingsMetadata {
	id: string;
	family: string;
	styles: string[];
	weights: number[];
	variable?: {
		wght?: { min: number; max: number };
		stretch?: { min: number; max: number };
		slnt?: { min: number; max: number };
	};
}

interface FontMetadata extends SettingsMetadata {
	// subset-weight-style -> base64
	base64: Record<string, string>;
	// subset -> unicode range
	unicodeRange: Record<string, string>;
}

export type { SettingsMetadata, FontMetadata };
