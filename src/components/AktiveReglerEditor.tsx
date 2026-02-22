// --- Fil: src/components/AktiveReglerEditor.tsx ---
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { BoligType, Region } from '../types';
import Select from 'react-select';

interface AktiveReglerEditorProps {
    value: Record<string, any[]>;
    onChange: (newValue: Record<string, any[]>) => void;
}

const AktiveReglerEditor: React.FC<AktiveReglerEditorProps> = ({ value, onChange }) => {
    const [boligtyper, setBoligtyper] = useState<BoligType[]>([]);
    const [regionerList, setRegionerList] = useState<Region[]>([]);

    useEffect(() => {
        const fetchBoligtyper = async () => {
            try {
                const data = await api.get<{ results: BoligType[] } | BoligType[]>('/kerne/boligtyper/');
                const res = Array.isArray(data) ? data : data.results;
                setBoligtyper(res || []);
            } catch (e) {
                console.error("Fejl ved hentning af boligtyper", e);
            }
        };
        const fetchRegioner = async () => {
            try {
                const data = await api.get<{ results: Region[] } | Region[]>('/kerne/regioner/');
                const res = Array.isArray(data) ? data : data.results;
                setRegionerList(res || []);
            } catch (e) {
                console.error("Fejl ved hentning af regioner", e);
            }
        };
        fetchBoligtyper();
        fetchRegioner();
    }, []);

    const handleRuleChange = (ruleName: string, selectedValues: any[]) => {
        const newValue = { ...value };
        if (selectedValues.length === 0) {
            delete newValue[ruleName];
        } else {
            newValue[ruleName] = selectedValues;
        }
        onChange(newValue);
    };

    const toggleBoligtype = (navn: string) => {
        const ruleName = 'Boligtype';
        const currentVals = value[ruleName] || [];
        const newVals = currentVals.includes(navn)
            ? currentVals.filter(v => v !== navn)
            : [...currentVals, navn];
        handleRuleChange(ruleName, newVals);
    };

    const toggleRegion = (nummer: number) => {
        const ruleName = 'Region';
        const currentVals = value[ruleName] || [];
        const currentNumVals = currentVals.map(Number);
        const newVals = currentNumVals.includes(nummer)
            ? currentNumVals.filter(v => v !== nummer)
            : [...currentNumVals, nummer];
        handleRuleChange(ruleName, newVals);
    };

    const handleStringListChange = (ruleName: string, commaSeparatedString: string) => {
        const vals = commaSeparatedString.split(',').map(s => s.trim()).filter(s => s !== '');
        handleRuleChange(ruleName, vals);
    };

    const handleIntListChange = (ruleName: string, commaSeparatedString: string) => {
        // Only split by comma. Because they might be typing "108" and we won't show it otherwise.
        const vals = commaSeparatedString.split(',').map(s => s.trim());
        // For ints we keep it as strings until we save or parse, wait.
        const intVals = vals.map(v => v === '' ? '' : (isNaN(parseInt(v)) ? v : parseInt(v))).filter(v => v !== '');
        handleRuleChange(ruleName, intVals);
    };

    return (
        <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Aktiveringsregler</h3>
            <p className="text-xs text-gray-500 mb-2">
                Hvis ingen regler er valgt, styres emnet direkte af sit eget 'Aktiv' flag. <br />
                Hvis en eller flere regler er sat, vil emnet <b>kun</b> blive aktiveret, hvis sagen opfylder <b>alle</b> regelsæt. Ellers bliver det oprettet som deaktiveret.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Boligtype</label>
                    <Select
                        isMulti
                        closeMenuOnSelect={false}
                        options={boligtyper.map(bt => ({ value: bt.navn, label: bt.navn }))}
                        value={(value['Boligtype'] || []).map(val => ({ value: val, label: val }))}
                        onChange={(selectedOptions) => {
                            const selectedValues = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                            handleRuleChange('Boligtype', selectedValues);
                        }}
                        placeholder="Vælg boligtyper..."
                        className="text-[12px]"
                        noOptionsMessage={() => "Ingen boligtyper fundet"}
                        styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Regioner</label>
                    <Select
                        isMulti
                        closeMenuOnSelect={false}
                        options={regionerList.map(reg => ({ value: reg.nummer, label: `${reg.nummer} - ${reg.navn}` }))}
                        value={(value['Region'] || []).map(val => {
                            const num = Number(val);
                            const r = regionerList.find(x => x.nummer === num);
                            return { value: num, label: r ? `${r.nummer} - ${r.navn}` : val.toString() }
                        })}
                        onChange={(selectedOptions) => {
                            const selectedValues = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                            handleRuleChange('Region', selectedValues);
                        }}
                        placeholder="Vælg regioner..."
                        className="text-[12px]"
                        noOptionsMessage={() => "Ingen regioner fundet"}
                        styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Postnumre</label>
                    <input
                        type="text"
                        value={(value['Postnummer'] || []).join(', ')}
                        onChange={(e) => handleStringListChange('Postnummer', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-[12px] bg-white transition-all shadow-sm mb-1"
                        placeholder="8000, 8200"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Skriv postnumre, adskilt af komma (f.eks: 8000, 8200)</p>
                </div>
            </div>
        </div>
    );
};

export default AktiveReglerEditor;
