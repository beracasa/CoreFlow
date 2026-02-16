
import { supabase } from './supabaseClient';

/**
 * Interfaz para documentos de máquinas
 */
export interface MachineDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
  type: string;
}

/**
 * Servicio para gestión de documentos de equipos
 * Maneja subida, descarga y eliminación de archivos en Supabase Storage
 */
export const DocumentService = {
  /**
   * Sube un archivo a Supabase Storage
   * @param machineId ID del equipo
   * @param file Archivo a subir
   * @returns Metadata del documento subido
   */
  async uploadDocument(
    machineId: string, 
    file: File
  ): Promise<MachineDocument> {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${machineId}/${timestamp}_${sanitizedFileName}`;
      
      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('machine-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw new Error(`Error al subir archivo: ${error.message}`);
      }

      // Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('machine-documents')
        .getPublicUrl(fileName);

      // Retornar metadata del documento
      return {
        id: crypto.randomUUID(),
        name: file.name,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        type: file.type
      };
    } catch (error: any) {
      console.error('DocumentService.uploadDocument error:', error);
      throw error;
    }
  },

  /**
   * Descarga un documento
   * @param url URL del documento
   * @param fileName Nombre del archivo para la descarga
   */
  async downloadDocument(url: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      console.error('DocumentService.downloadDocument error:', error);
      throw new Error('Error al descargar el documento');
    }
  },

  /**
   * Elimina un documento de Supabase Storage
   * @param filePath Ruta del archivo en el bucket (ej: machineId/timestamp_filename.pdf)
   */
  async deleteDocument(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('machine-documents')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting from Supabase Storage:', error);
        throw new Error(`Error al eliminar archivo: ${error.message}`);
      }
    } catch (error: any) {
      console.error('DocumentService.deleteDocument error:', error);
      throw error;
    }
  },

  /**
   * Extrae la ruta del archivo desde una URL de Supabase Storage
   * @param url URL completa del archivo
   * @returns Ruta del archivo en el bucket
   */
  extractFilePathFromUrl(url: string): string {
    try {
      // URL format: https://{project}.supabase.co/storage/v1/object/public/machine-documents/{filePath}
      const parts = url.split('/machine-documents/');
      if (parts.length < 2) {
        throw new Error('URL inválida');
      }
      return parts[1];
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return '';
    }
  },

  /**
   * Formatea el tamaño del archivo en formato legible
   * @param bytes Tamaño en bytes
   * @returns String formateado (ej: "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
};
