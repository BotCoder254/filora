import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesService } from '../services/files';

export const useFiles = (folderId = null) => {
  return useQuery({
    queryKey: ['files', folderId],
    queryFn: () => filesService.getFiles(folderId),
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000
  });
};

export const useFolders = (parentId = null) => {
  return useQuery({
    queryKey: ['folders', parentId],
    queryFn: () => filesService.getFolders(parentId),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: filesService.uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: filesService.createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: filesService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: filesService.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useCreateShareLink = () => {
  return useMutation({
    mutationFn: filesService.createShareLink,
  });
};