import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabase';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';
import storageService from './storageService';

function mapPatient(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    patientAge: row.age,
    phone: row.phone || '',
    patientConditions: row.conditions || '',
    address: {
      street: row.street || '',
      city: row.city || '',
      postalCode: row.postal_code || '',
    },
    managedByEstablishmentId: row.establishment_id,
    managedAccount: true,
    createdAt: row.created_at,
  };
}

function toRow(establishmentId, patient) {
  return {
    establishment_id: establishmentId,
    first_name: patient.firstName.trim(),
    last_name: patient.lastName.trim(),
    age: patient.age ? Number(patient.age) : null,
    phone: patient.phone?.trim() || '',
    conditions: patient.conditions?.trim() || '',
    street: patient.street?.trim() || '',
    city: patient.city?.trim() || '',
    postal_code: patient.postalCode?.trim() || '',
  };
}

export const managedPatientService = {
  async getByEstablishment(establishmentId) {
    if (isDemoMode) {
      return storageService.getUsers().filter(user =>
        user.managedAccount && user.managedByEstablishmentId === establishmentId
      );
    }
    assertBackendConfigured();
    const { data, error } = await supabase.from('managed_patients').select('*')
      .eq('establishment_id', establishmentId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPatient);
  },

  async create(establishmentId, patient) {
    if (!patient.firstName?.trim() || !patient.lastName?.trim()) {
      throw new Error('Le prénom et le nom sont obligatoires.');
    }

    if (isDemoMode) {
      const localPatient = {
        id: uuidv4(),
        firstName: patient.firstName.trim(),
        lastName: patient.lastName.trim(),
        patientAge: patient.age ? Number(patient.age) : null,
        phone: patient.phone?.trim() || '',
        patientConditions: patient.conditions?.trim() || '',
        address: {
          street: patient.street?.trim() || '',
          city: patient.city?.trim() || '',
          postalCode: patient.postalCode?.trim() || '',
        },
        managedByEstablishmentId: establishmentId,
        managedAccount: true,
        createdAt: new Date().toISOString(),
      };
      storageService.setUsers([localPatient, ...storageService.getUsers()]);
      return localPatient;
    }

    assertBackendConfigured();
    const { data, error } = await supabase.from('managed_patients')
      .insert(toRow(establishmentId, patient)).select().single();
    if (error) throw new Error(error.message);
    return mapPatient(data);
  },
};

export default managedPatientService;
