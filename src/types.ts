interface AxisRange {
	min: number | string;
	max: number | string;
}

interface VariableAxes extends Record<string, AxisRange | undefined> {
	ital?: AxisRange;
	opsz?: AxisRange;
	slnt?: AxisRange;
	wdth?: AxisRange;
	wght?: AxisRange;
}

interface BaseMetadata {
	id: string;
	family: string;
	subsets: string[];
	styles: string[];
	weights: number[];
	variable?: VariableAxes;
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

export type {
	FontMetadata,
	FontType,
	SettingsMetadata,
	SettingsPrecedence,
	VariableAxes,
};
