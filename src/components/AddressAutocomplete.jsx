// ── Address Autocomplete Component ──
import { useState, useEffect, useRef, useCallback } from 'react';
import geocodingService from '../services/geocodingService';
import { MapPin, Loader2, X } from 'lucide-react';

/**
 * @param {Object} props
 * @param {Function} props.onSelect - Callback: ({ street, city, postcode, lat, lng, label }) => void
 * @param {string} [props.initialValue] - Valeur initiale du champ
 * @param {string} [props.placeholder] - Placeholder
 * @param {boolean} [props.showMiniMap] - Afficher une mini-carte après sélection (handled externally)
 */
export default function AddressAutocomplete({ onSelect, initialValue = '', placeholder = 'Saisissez une adresse...', disabled = false }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced search
  const doSearch = useCallback(async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    const results = await geocodingService.searchAddress(text, 6);
    setSuggestions(results);
    setIsOpen(results.length > 0);
    setSelectedIndex(-1);
    setIsLoading(false);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (suggestion) => {
    let finalStreet = suggestion.street || '';
    let finalLabel = suggestion.label || '';
    
    // Preserve house number if user typed it but API returned a generic street
    const queryMatch = query.trim().match(/^(\d+[\s\w]*)\s/);
    const suggestionMatch = finalLabel.match(/^(\d+)/);
    
    if (queryMatch && !suggestionMatch && finalStreet) {
      finalStreet = `${queryMatch[1].trim()} ${finalStreet}`;
      finalLabel = `${queryMatch[1].trim()} ${finalLabel}`;
    }

    setQuery(finalLabel);
    setIsOpen(false);
    setSuggestions([]);
    onSelect({
      street: finalStreet,
      city: suggestion.city,
      postcode: suggestion.postcode,
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: finalLabel,
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Update query when initialValue changes externally
  useEffect(() => {
    if (initialValue && !query) setQuery(initialValue);
  }, [initialValue, query]);

  return (
    <div className="address-autocomplete" ref={wrapperRef}>
      <div className="address-autocomplete-input-wrapper">
        <MapPin size={18} className="address-autocomplete-icon" />
        <input
          ref={inputRef}
          type="text"
          className="form-input address-autocomplete-input"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 size={16} className="address-autocomplete-loader" />
        )}
        {query && !isLoading && (
          <button
            type="button"
            className="address-autocomplete-clear"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="address-autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              className={`address-autocomplete-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <MapPin size={14} className="address-autocomplete-item-icon" />
              <div className="address-autocomplete-item-content">
                <div className="address-autocomplete-item-label">{s.label}</div>
                <div className="address-autocomplete-item-context">{s.context}</div>
              </div>
            </li>
          ))}
          <li className="address-autocomplete-credit">
            Données © Géoplateforme IGN
          </li>
        </ul>
      )}
    </div>
  );
}
