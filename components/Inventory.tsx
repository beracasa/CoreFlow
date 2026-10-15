import React, { useState, useEffect } from 'react';
import { InventoryList } from '../src/components/inventory/InventoryList';
import { PartRequestForm } from '../src/components/inventory/PartRequestForm';
import { ReceptionForm } from '../src/components/inventory/ReceptionForm';
import { PartCreationForm } from '../src/components/inventory/PartCreationForm';
import { RequestList } from '../src/components/inventory/RequestList';
import { PurchaseRequestList } from '../src/components/inventory/PurchaseRequestList';
import { RequestDetail } from '../src/components/inventory/RequestDetail';
import { inventoryService } from '../src/services';
import { PartsRequest, SparePart } from '../src/types/inventory';
import { useAuth } from '../contexts/AuthContext';
import { Layers, FileText, ArrowDownCircle, PlusCircle, List, Shield, Eye, Edit3 } from 'lucide-react';

export const Inventory: React.FC<any> = () => {
  const { hasPermission } = useAuth();

  const canManage = hasPermission('manage_inventory') || hasPermission('manage_assets');
  const canViewInventory = canManage || hasPermission('view_inventory');
  const canViewPartRequests = canManage || hasPermission('view_part_requests');
  const canViewPurchaseRequests = canManage || hasPermission('view_purchase_requests');

  const canAccessModule = canManage || canViewInventory || canViewPartRequests || canViewPurchaseRequests;

  if (!canAccessModule) {
    return (
      <div className="h-full flex items-center justify-center bg-industrial-900 text-industrial-500 flex-col gap-4">
        <Shield className="w-12 h-12 text-red-900" />
        <span className="text-base font-semibold">Acceso Restringido: Se requieren permisos para acceder al módulo de Repuestos.</span>
      </div>
    );
  }

  // Determine initial valid tab based on permissions
  const getInitialTab = (): 'list' | 'requests_list' | 'purchase_requests' => {
    if (canViewInventory) return 'list';
    if (canViewPartRequests) return 'requests_list';
    if (canViewPurchaseRequests) return 'purchase_requests';
    return 'list';
  };

  const [activeTab, setActiveTab] = useState<'list' | 'request' | 'requests_list' | 'receive' | 'create' | 'purchase_requests'>(getInitialTab);
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [parts, setParts] = useState<SparePart[]>([]);

  // Automatically fall back if current active tab is not allowed
  useEffect(() => {
    if (activeTab === 'list' && !canViewInventory) {
      setActiveTab(getInitialTab());
    } else if (activeTab === 'requests_list' && !canViewPartRequests) {
      setActiveTab(getInitialTab());
    } else if (activeTab === 'purchase_requests' && !canViewPurchaseRequests) {
      setActiveTab(getInitialTab());
    } else if (['request', 'receive', 'create'].includes(activeTab) && !canManage) {
      setActiveTab(getInitialTab());
    }
  }, [canViewInventory, canViewPartRequests, canViewPurchaseRequests, canManage, activeTab]);

  // Fetch parts when entering requests list, as we need them for names and details
  useEffect(() => {
    if (activeTab === 'requests_list') {
      inventoryService.getAllParts(1, 1000).then(res => setParts(res.data)).catch(err => console.error('Error fetching parts:', err));
    }
  }, [activeTab]);

  const handleSelectRequest = async (request: PartsRequest) => {
    try {
      const fullRequest = await inventoryService.getRequestById(request.id);
      setSelectedRequest(fullRequest);
    } catch (error) {
      console.error('Error fetching request details:', error);
      setSelectedRequest(request);
    }
  };

  const handleBackToRequestList = () => {
    setSelectedRequest(null);
  };

  return (
    <div className="h-full bg-industrial-900 p-6 overflow-auto">

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white mb-1">Repuestos</h1>
            {canManage ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <Edit3 size={12} /> Gestión Total Habilitada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-industrial-800 text-industrial-400 border border-industrial-700 shadow-sm">
                <Eye size={12} /> Modo Solo Lectura
              </span>
            )}
          </div>
          <p className="text-industrial-500 text-sm">Gestiona el inventario, solicitudes y recepciones.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {canViewInventory && (
          <button
            onClick={() => { setActiveTab('list'); setSelectedRequest(null); }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'list'
              ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
              : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
              }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            Stock Actual
          </button>
        )}

        {canViewPartRequests && (
          <button
            onClick={() => { setActiveTab('requests_list'); setSelectedRequest(null); }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'requests_list'
              ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
              : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
              }`}
          >
            <List className="w-4 h-4 mr-2" />
            Lista Solicitudes
          </button>
        )}

        {canManage && (
          <>
            <button
              onClick={() => setActiveTab('request')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'request'
                ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
                : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
                }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Nueva Solicitud
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'receive'
                ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
                : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
                }`}
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Recepción
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'create'
                ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
                : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
                }`}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Nuevo Repuesto
            </button>
          </>
        )}

        {canViewPurchaseRequests && (
          <button
            onClick={() => { setActiveTab('purchase_requests'); setSelectedRequest(null); }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'purchase_requests'
              ? 'bg-industrial-800 text-white border-industrial-600 shadow-md'
              : 'bg-transparent text-industrial-500 border-transparent hover:text-industrial-300 hover:bg-industrial-800/50'
              }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Solicitudes Compras
          </button>
        )}
      </div>

      <div className="bg-industrial-900 rounded-xl min-h-[500px]">
        {activeTab === 'list' && canViewInventory && <InventoryList />}
        {activeTab === 'request' && canManage && <PartRequestForm />}
        {activeTab === 'receive' && canManage && <ReceptionForm />}
        {activeTab === 'create' && canManage && <PartCreationForm />}
        {activeTab === 'purchase_requests' && canViewPurchaseRequests && <PurchaseRequestList />}
        {activeTab === 'requests_list' && canViewPartRequests && (
          selectedRequest ? (
            <RequestDetail request={selectedRequest} parts={parts} onBack={handleBackToRequestList} />
          ) : (
            <RequestList onSelectRequest={handleSelectRequest} />
          )
        )}
      </div>

    </div>
  );
};