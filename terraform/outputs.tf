output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "eks_cluster_name" {
  value       = aws_eks_cluster.eks.name
  description = "EKS Cluster Name"
}

output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.eks.endpoint
  description = "EKS Cluster Endpoint API URL"
}
