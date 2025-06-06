
import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ChartContainer } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CompetencySelector from './CompetencySelector';

// Define types
type Competency = {
  id: string;
  name: string;
  description: string;
};

type CompetencyWeightsProps = {
  competencies: Competency[];
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>, isValid: boolean) => void;
};

// Define colors for the pie chart
const COLORS = [
  '#8B5CF6', // Vivid Purple
  '#7E69AB', // Secondary Purple
  '#6E59A5', // Tertiary Purple
  '#D6BCFA', // Light Purple
  '#9b87f5', // Primary Purple
  '#E5DEFF', // Soft Purple
];

export const CompetencyWeights: React.FC<CompetencyWeightsProps> = ({ 
  competencies, 
  weights, 
  onChange 
}) => {
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [localWeights, setLocalWeights] = useState<Record<string, number>>(weights);
  const [totalWeight, setTotalWeight] = useState(0);
  const [customCompetencies, setCustomCompetencies] = useState<Competency[]>([]);
  
  // Combine provided competencies with custom ones
  const allCompetencies = [...competencies, ...customCompetencies];

  // Initialize selected competencies if weights are provided
  useEffect(() => {
    const initialSelected = Object.keys(weights).filter(id => weights[id] > 0);
    
    if (initialSelected.length === 0 && competencies.length > 0) {
      // Auto-select first three competencies if none are selected
      const defaultSelected = competencies.slice(0, 3).map(c => c.id);
      setSelectedCompetencies(defaultSelected);
      
      // Distribute weights evenly
      const defaultWeight = Math.floor(100 / defaultSelected.length);
      const defaultWeights = defaultSelected.reduce((acc, id, index) => {
        // Add remainder to last competency to ensure total is 100%
        acc[id] = index === defaultSelected.length - 1 
          ? 100 - (defaultWeight * (defaultSelected.length - 1)) 
          : defaultWeight;
        return acc;
      }, {} as Record<string, number>);
      
      setLocalWeights(defaultWeights);
      onChange(defaultWeights, true);
    } else {
      setSelectedCompetencies(initialSelected);
    }
  }, [competencies]);

  // Calculate total weight whenever weights change
  useEffect(() => {
    const total = Object.values(localWeights).reduce((sum, weight) => sum + weight, 0);
    setTotalWeight(total);
    onChange(localWeights, total === 100);
  }, [localWeights, onChange]);

  // Add a competency from the dropdown
  const handleAddCompetency = (id: string) => {
    if (!selectedCompetencies.includes(id)) {
      const newSelected = [...selectedCompetencies, id];
      setSelectedCompetencies(newSelected);
      
      // Start with 0 weight for the new competency
      setLocalWeights(prev => ({ ...prev, [id]: 0 }));
    }
  };

  // Add a custom competency
  const handleAddCustomCompetency = (name: string, description: string) => {
    const newId = `custom-${Date.now()}`;
    const newCompetency = {
      id: newId,
      name,
      description
    };
    
    setCustomCompetencies(prev => [...prev, newCompetency]);
    handleAddCompetency(newId);
  };

  // Remove a competency
  const handleRemoveCompetency = (id: string) => {
    // Remove the competency
    const newSelected = selectedCompetencies.filter(cId => cId !== id);
    setSelectedCompetencies(newSelected);
    
    // Remove weight
    const newWeights = { ...localWeights };
    const removedWeight = newWeights[id] || 0;
    delete newWeights[id];
    
    // Redistribute the removed weight among remaining competencies
    if (removedWeight > 0 && newSelected.length > 0) {
      const additionalPerCompetency = Math.floor(removedWeight / newSelected.length);
      newSelected.forEach((cId, index) => {
        if (index === newSelected.length - 1) {
          // Add any remainder to the last competency
          newWeights[cId] = (newWeights[cId] || 0) + 
            (removedWeight - (additionalPerCompetency * (newSelected.length - 1)));
        } else {
          newWeights[cId] = (newWeights[cId] || 0) + additionalPerCompetency;
        }
      });
    }
    
    setLocalWeights(newWeights);
  };

  // Update weight for a specific competency
  const updateWeight = (id: string, value: number) => {
    // Ensure weight doesn't make total exceed 100%
    let clampedValue = Math.max(0, Math.min(100, value));
    
    const currentTotal = Object.entries(localWeights)
      .filter(([key]) => key !== id)
      .reduce((sum, [, val]) => sum + val, 0);
    
    // If new total would exceed 100%, clamp the value
    if (currentTotal + clampedValue > 100) {
      clampedValue = 100 - currentTotal;
    }
    
    setLocalWeights(prev => ({ ...prev, [id]: clampedValue }));
  };

  // Distribute weights evenly among selected competencies
  const distributeEvenly = () => {
    if (selectedCompetencies.length === 0) return;
    
    const evenWeight = Math.floor(100 / selectedCompetencies.length);
    const remainder = 100 - (evenWeight * selectedCompetencies.length);
    
    const newWeights = selectedCompetencies.reduce((acc, id, index) => {
      acc[id] = evenWeight + (index === 0 ? remainder : 0);
      return acc;
    }, {} as Record<string, number>);
    
    setLocalWeights(newWeights);
  };

  // Reset all weights
  const resetWeights = () => {
    const newWeights = selectedCompetencies.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    setLocalWeights(newWeights);
  };

  // Prepare data for pie chart
  const chartData = selectedCompetencies.map(id => {
    const competency = allCompetencies.find(c => c.id === id);
    return {
      name: competency?.name || 'Unknown',
      value: localWeights[id] || 0
    };
  }).filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="font-medium">
          Total: <span className={totalWeight === 100 ? "text-green-600" : "text-red-600"}>
            {totalWeight}%
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            {totalWeight < 100 ? `(${100 - totalWeight}% remaining)` : 
             totalWeight > 100 ? `(${totalWeight - 100}% over limit)` : ''}
          </span>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={distributeEvenly}
            disabled={selectedCompetencies.length === 0}
          >
            Distribute Evenly
          </Button>
          <Button 
            variant="outline" 
            onClick={resetWeights}
            disabled={selectedCompetencies.length === 0}
          >
            Reset Weights
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <CompetencySelector
          availableCompetencies={allCompetencies}
          selectedCompetencies={selectedCompetencies}
          onAddCompetency={handleAddCompetency}
          onAddCustomCompetency={handleAddCustomCompetency}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {selectedCompetencies.map((id) => {
            const competency = allCompetencies.find(c => c.id === id);
            if (!competency) return null;
            
            return (
              <div 
                key={id} 
                className="border rounded-md p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 w-full">
                    <div className="font-medium flex justify-between">
                      <span>{competency.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveCompetency(id)}
                        className="h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{competency.description}</p>
                    
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Weight:</span>
                        <span className="text-sm font-medium">
                          {localWeights[id] || 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Slider 
                          value={[localWeights[id] || 0]} 
                          min={0} 
                          max={100} 
                          step={1}
                          onValueChange={(value) => updateWeight(id, value[0])}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={localWeights[id] || 0}
                          onChange={(e) => updateWeight(id, parseInt(e.target.value) || 0)}
                          className="w-16 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-80 flex flex-col">
          {chartData.length > 0 ? (
            <ChartContainer
              config={{
                ...chartData.reduce((acc, item, index) => {
                  acc[item.name] = {
                    label: item.name,
                    theme: {
                      light: COLORS[index % COLORS.length],
                      dark: COLORS[index % COLORS.length]
                    }
                  };
                  return acc;
                }, {} as any)
              }}
              className="w-full h-full"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full border rounded-md bg-muted/20">
              <p className="text-muted-foreground text-center">
                Add competencies and assign weights to see the distribution
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
