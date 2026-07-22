import { zodResponsesFunction } from 'openai/helpers/zod';
import { searchNusModulesInputSchema } from './module-recommendation.schemas';

export const searchNusModulesTool = zodResponsesFunction({
  name: 'search_nus_modules',
  description:
    'Search the local NUS module catalogue using bounded filters. Use exact codes and code prefixes from graduation requirements whenever possible.',
  parameters: searchNusModulesInputSchema,
});
