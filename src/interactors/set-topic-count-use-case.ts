
import { Bluebird } from '../utils';
import { BaseUseCase, UseCase } from './use-case';
import { Repository, WikiEntityRepository, RepUpdateData, RepUpdateOptions, TopicCountRepository } from './repository';
import { TopicIdIndexKey } from './data-keys';
import { QuizItem, Quiz } from '../entities';

export class SetTopicCountUseCase<T extends (QuizItem | Quiz)> extends BaseUseCase<string, number, undefined>{
    constructor(private updateEntity: UseCase<RepUpdateData<T>, T, RepUpdateOptions>, private repository: TopicCountRepository<T>, private countName: 'countQuizzes' | 'countQuizItems') {
        super('SetTopicCount');
    }

    protected innerExecute(topicId: string): Bluebird<number> {
        return this.repository.countByTopicId(topicId)
            .then(count => {
                const obj = <T>{ id: topicId };
                obj[this.countName] = count;
                return this.updateEntity.execute({ item: obj }).return(count);
            });
    }
}
