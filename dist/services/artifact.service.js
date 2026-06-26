import { createArtifactSchema } from '../contracts/artifacts.js';
import { SwarmArtifact } from '../models/artifact.model.js';
import { SwarmJob } from '../models/job.model.js';
import { AppError } from '../utils/errors.js';
export async function createArtifact(input) {
    const parsed = createArtifactSchema.parse(input);
    return SwarmArtifact.create(parsed);
}
export async function getArtifactById(artifactId) {
    const artifact = await SwarmArtifact.findOne({ artifactId });
    if (!artifact)
        throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    return artifact;
}
export async function listArtifacts(query) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const filter = {};
    if (query.vertical)
        filter.vertical = query.vertical;
    if (query.artifactType)
        filter.artifactType = query.artifactType;
    if (query.reviewStatus)
        filter.reviewStatus = query.reviewStatus;
    const [items, total] = await Promise.all([
        SwarmArtifact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        SwarmArtifact.countDocuments(filter),
    ]);
    return { items, total, page, limit };
}
export async function reviewArtifact(input) {
    const artifact = await getArtifactById(input.artifactId);
    artifact.reviewStatus = input.reviewStatus;
    artifact.reviewedAt = new Date();
    artifact.reviewedBy = input.reviewedBy;
    artifact.reviewReason = input.reason;
    await artifact.save();
    if (['APPROVED', 'REJECTED', 'PUBLISHED'].includes(input.reviewStatus)) {
        const jobStatus = input.reviewStatus === 'APPROVED'
            ? 'approved'
            : input.reviewStatus === 'PUBLISHED'
                ? 'published'
                : 'rejected';
        await SwarmJob.updateOne({ jobId: artifact.jobId }, {
            $set: { status: jobStatus },
            $push: { statusHistory: { status: jobStatus, at: new Date(), reason: input.reason } },
        });
    }
    return artifact;
}
